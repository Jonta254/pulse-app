import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveMarket, voidMarket } from "@/lib/verdex/db";
import { generateDataMarkets, parseDataMarketId, resolveDataMarketOutcome } from "@/lib/verdex/dataOracle";
import { generateFootballMarkets, parseFootballMarketId, resolveFootballOutcome } from "@/lib/verdex/footballOracle";
import { generateWeatherMarkets, generateNbaMarkets, generateWikiDuels, resolveExtraOutcome } from "@/lib/verdex/extraOracles";
import { generateRocketMarkets, generateFxMarkets, generateFngMarkets, generatePolymarketMirrors, resolveMacroOutcome } from "@/lib/verdex/macroOracles";
import { upsertMarkets } from "@/lib/verdex/db";
import { processQueuedPayouts, notifyPaidWinners } from "@/lib/verdex/payouts";
import { isTreasuryPayoutEnabled } from "@/lib/verdex/treasury";
import { noStoreJson } from "@/lib/serverApi";

// GET/POST /api/verdex/auto — the zero-cost autopilot. Runs with NO AI:
//   1. Resolves every due data market from Kraken's public candles
//   2. Sends queued WLD payouts (when the treasury rail is enabled)
//   3. Refills flash + daily crypto markets so the board never runs dry
// Called by Vercel cron (daily) and self-triggered from the flash endpoint.
// CRON_SECRET protected; self-throttled to one run per 5 minutes.

export const maxDuration = 300;

const FLASH_TARGET = 14;  // always 14 live micro markets
const DAILY_TARGET = 12;  // 12 daily crypto price markets
const SPORTS_TARGET = 18; // ~6 World Cup matches × 3 markets each
const NBA_TARGET = 8;     // 4 games × (winner + total points)
const WEATHER_TARGET = 10;
const WIKI_TARGET = 6;
const ROCKET_TARGET = 4;
const FX_TARGET = 6;
const FNG_TARGET = 2;
const PM_TARGET = 8;  // mirror top-volume Polymarket questions

let lastRunAt = 0; // per-instance throttle for self-triggered calls

async function runAutopilot(force: boolean) {
  if (!force && Date.now() - lastRunAt < 5 * 60_000) {
    return { ok: true, skipped: true as const };
  }
  lastRunAt = Date.now();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, error: "Database not configured." };
  const db = createClient(url, key, { auth: { persistSession: false } });

  // 1. Resolve due data markets
  const { data: due } = await db
    .from("verdex_markets")
    .select("id")
    .eq("status", "open")
    .like("id", "data-v1-%")
    .lte("closes_at", new Date().toISOString())
    .limit(25);

  let resolved = 0;
  let unresolvable = 0;
  for (const m of due ?? []) {
    let outcome: "yes" | "no" | null = null;
    const macro = await resolveMacroOutcome(m.id); // rockets / FX / fear-greed
    const extra = macro !== undefined ? macro : await resolveExtraOutcome(m.id); // weather / NBA / wiki
    if (macro !== undefined || extra !== undefined) {
      outcome = macro !== undefined ? macro : (extra as "yes" | "no" | null);
    } else {
      const fb = parseFootballMarketId(m.id);
      if (fb) {
        // Football resolves only after the final whistle — wait for resolves_at
        outcome = await resolveFootballOutcome(fb);
      } else {
        const parsed = parseDataMarketId(m.id);
        if (parsed) outcome = await resolveDataMarketOutcome(parsed);
      }
    }
    if (!outcome) { unresolvable++; continue; } // data not available yet — retry next run
    const result = await resolveMarket(m.id, outcome);
    if (result.ok) resolved++;
  }

  // 1b. Board hygiene: void + refund anything that can never resolve.
  //   - non-data markets (seed/AI) 48h past their deadline (no resolver exists)
  //   - data markets 7 days past their deadline (source never produced a result,
  //     e.g. a postponed match) — players get their stakes back instead of limbo
  let voided = 0;
  const staleNonData = await db
    .from("verdex_markets").select("id")
    .in("status", ["open", "closed"])
    .not("id", "like", "data-v1-%")
    .lt("resolves_at", new Date(Date.now() - 48 * 3_600_000).toISOString())
    .limit(10);
  const staleData = await db
    .from("verdex_markets").select("id")
    .in("status", ["open", "closed"])
    .like("id", "data-v1-%")
    .lt("resolves_at", new Date(Date.now() - 7 * 86_400_000).toISOString())
    .limit(10);
  for (const m of [...(staleNonData.data ?? []), ...(staleData.data ?? [])]) {
    const r = await voidMarket(m.id, "No resolution source produced a result before the deadline");
    if (r.ok) voided++;
  }

  // 2. Pay winners (and refunds)
  let payoutRun = null;
  if ((resolved > 0 || voided > 0) && isTreasuryPayoutEnabled()) {
    payoutRun = await processQueuedPayouts({ limit: 25 });
    if (payoutRun.paidWallets.length > 0) await notifyPaidWinners(payoutRun.paidWallets);
  }

  // 3. Refill the board
  const nowIso = new Date().toISOString();
  const [{ count: flashOpen }, { count: dailyOpen }, { data: allData }] = await Promise.all([
    db.from("verdex_markets").select("id", { count: "exact", head: true })
      .eq("status", "open").eq("category", "micro").gt("closes_at", nowIso),
    db.from("verdex_markets").select("id", { count: "exact", head: true })
      .eq("status", "open").eq("category", "crypto").like("id", "data-v1-%").gt("closes_at", nowIso),
    // every data market — used for open counts, and as dedupe sets so the
    // same match / city-day / duel-day is never offered twice
    db.from("verdex_markets").select("id, status, closes_at")
      .like("id", "data-v1-%").order("created_at", { ascending: false }).limit(2000),
  ]);

  type Row = { id: string; status: string; closes_at: string };
  const rows = (allData ?? []) as Row[];
  const openOf = (prefix: string) =>
    rows.filter((r) => r.id.startsWith(prefix) && r.status === "open" && r.closes_at > nowIso).length;

  const fbEvents = new Set<string>(); const nbaEvents = new Set<string>();
  const wxKeys = new Set<string>(); const wikiKeys = new Set<string>();
  const rktIds = new Set<string>(); const fxKeys = new Set<string>(); const fngDays = new Set<string>();
  const pmIds = new Set<string>();
  for (const r of rows) {
    const p = r.id.split("-");
    if (r.id.startsWith("data-v1-fb-")) fbEvents.add(p[3]);
    else if (r.id.startsWith("data-v1-nba-")) nbaEvents.add(p[3]);
    else if (r.id.startsWith("data-v1-wx-")) wxKeys.add(`${p[3]}-${p[4]}-${p[6]}`);
    else if (r.id.startsWith("data-v1-wiki-")) wikiKeys.add(`${p[3]}-${p[4]}-${p[5]}`);
    else if (r.id.startsWith("data-v1-rkt-")) rktIds.add(p[3]);
    else if (r.id.startsWith("data-v1-fx-")) fxKeys.add(`${p[3]}-${p[5]}`);
    else if (r.id.startsWith("data-v1-fng-")) fngDays.add(p[4]);
    else if (r.id.startsWith("data-v1-pm-")) pmIds.add(p[3]);
  }

  const flashNeeded = Math.max(0, FLASH_TARGET - (flashOpen ?? 0));
  const dailyNeeded = Math.max(0, DAILY_TARGET - (dailyOpen ?? 0));
  let generated = 0;
  const batch: Awaited<ReturnType<typeof generateDataMarkets>> = [];

  if (flashNeeded > 0 || dailyNeeded > 0) {
    batch.push(...await generateDataMarkets({ flash: flashNeeded, daily: dailyNeeded }));
  }
  const sportsNeeded = Math.max(0, SPORTS_TARGET - openOf("data-v1-fb-"));
  if (sportsNeeded > 0) {
    batch.push(...await generateFootballMarkets({ need: sportsNeeded, excludeEventIds: fbEvents }));
  }
  const nbaNeeded = Math.max(0, NBA_TARGET - openOf("data-v1-nba-"));
  if (nbaNeeded > 0) {
    batch.push(...await generateNbaMarkets({ need: nbaNeeded, excludeEventIds: nbaEvents }));
  }
  const wxNeeded = Math.max(0, WEATHER_TARGET - openOf("data-v1-wx-"));
  if (wxNeeded > 0) {
    batch.push(...await generateWeatherMarkets({ need: wxNeeded, excludeKeys: wxKeys }));
  }
  const wikiNeeded = Math.max(0, WIKI_TARGET - openOf("data-v1-wiki-"));
  if (wikiNeeded > 0) {
    batch.push(...generateWikiDuels({ need: wikiNeeded, excludeKeys: wikiKeys }));
  }
  const rktNeeded = Math.max(0, ROCKET_TARGET - openOf("data-v1-rkt-"));
  if (rktNeeded > 0) {
    batch.push(...await generateRocketMarkets({ need: rktNeeded, excludeLaunchIds: rktIds }));
  }
  const fxNeeded = Math.max(0, FX_TARGET - openOf("data-v1-fx-"));
  if (fxNeeded > 0) {
    batch.push(...await generateFxMarkets({ need: fxNeeded, excludeKeys: fxKeys }));
  }
  const fngNeeded = Math.max(0, FNG_TARGET - openOf("data-v1-fng-"));
  if (fngNeeded > 0) {
    batch.push(...await generateFngMarkets({ need: fngNeeded, excludeKeys: fngDays }));
  }
  const pmNeeded = Math.max(0, PM_TARGET - openOf("data-v1-pm-"));
  if (pmNeeded > 0) {
    batch.push(...await generatePolymarketMirrors({ need: pmNeeded, excludeIds: pmIds }));
  }

  if (batch.length > 0 && (await upsertMarkets(batch))) generated = batch.length;

  return {
    ok: true,
    skipped: false as const,
    resolved,
    voided,
    unresolvable,
    generated,
    payouts: payoutRun ? { paid: payoutRun.paid, failed: payoutRun.failed } : null,
  };
}

// Daily "one perfect market" push — the morning cron picks the most exciting
// upcoming market and nudges every known player. Runs at most once per day.
async function sendDailyFeatured(secret: string) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (!url || !key || !appUrl) return;
  const db = createClient(url, key, { auth: { persistSession: false } });

  const soon = new Date(Date.now() + 4 * 3_600_000).toISOString();
  const horizon = new Date(Date.now() + 72 * 3_600_000).toISOString();
  const { data: pick } = await db
    .from("verdex_markets")
    .select("title")
    .eq("status", "open")
    .gt("closes_at", soon)
    .lt("closes_at", horizon)
    .order("featured", { ascending: false })
    .order("closes_at", { ascending: true })
    .limit(1);
  const title = pick?.[0]?.title;
  if (!title) return;

  const { data: players } = await db.from("verdex_player_stats").select("world_nullifier").limit(1000);
  const wallets = ((players ?? []) as Array<{ world_nullifier: string }>)
    .map((p) => p.world_nullifier)
    .filter((w) => /^0x[a-fA-F0-9]{40}$/.test(w));
  if (wallets.length === 0) return;

  await fetch(`${appUrl}/api/verdex/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ featuredTitle: title, nullifiers: wallets }),
  }).catch(() => null);
}

async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return noStoreJson({ error: "Unauthorized." }, { status: 401 });
  }
  // Cron calls (GET with auth) force a run; self-triggers respect the throttle
  const force = req.method === "GET";
  const summary = await runAutopilot(force);

  // Morning cron extras (once daily): kick the AI oracle (no-op without
  // Anthropic credits) and send the "one perfect market" push to all players.
  if (force && new Date().getUTCHours() < 12 && secret) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    if (appUrl) {
      fetch(`${appUrl}/api/verdex/oracle`, { headers: { Authorization: `Bearer ${secret}` } }).catch(() => null);
    }
    await sendDailyFeatured(secret);
  }

  return noStoreJson(summary, { status: summary.ok ? 200 : 503 });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
