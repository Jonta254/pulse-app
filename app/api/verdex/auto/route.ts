import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveMarket } from "@/lib/verdex/db";
import { generateDataMarkets, parseDataMarketId, resolveDataMarketOutcome } from "@/lib/verdex/dataOracle";
import { generateFootballMarkets, parseFootballMarketId, resolveFootballOutcome } from "@/lib/verdex/footballOracle";
import { generateWeatherMarkets, generateNbaMarkets, generateWikiDuels, resolveExtraOutcome } from "@/lib/verdex/extraOracles";
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

const FLASH_TARGET = 6;
const DAILY_TARGET = 6;
const SPORTS_TARGET = 9; // ~3 World Cup matches × 3 markets each
const NBA_TARGET = 4;    // 2 games × (winner + total points)
const WEATHER_TARGET = 4;
const WIKI_TARGET = 3;

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
    const extra = await resolveExtraOutcome(m.id); // weather / NBA / wiki duels
    if (extra !== undefined) {
      outcome = extra;
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

  // 2. Pay winners
  let payoutRun = null;
  if (resolved > 0 && isTreasuryPayoutEnabled()) {
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
  for (const r of rows) {
    const p = r.id.split("-");
    if (r.id.startsWith("data-v1-fb-")) fbEvents.add(p[3]);
    else if (r.id.startsWith("data-v1-nba-")) nbaEvents.add(p[3]);
    else if (r.id.startsWith("data-v1-wx-")) wxKeys.add(`${p[3]}-${p[4]}-${p[6]}`);
    else if (r.id.startsWith("data-v1-wiki-")) wikiKeys.add(`${p[3]}-${p[4]}-${p[5]}`);
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

  if (batch.length > 0 && (await upsertMarkets(batch))) generated = batch.length;

  return {
    ok: true,
    skipped: false as const,
    resolved,
    unresolvable,
    generated,
    payouts: payoutRun ? { paid: payoutRun.paid, failed: payoutRun.failed } : null,
  };
}

async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return noStoreJson({ error: "Unauthorized." }, { status: 401 });
  }
  // Cron calls (GET with auth) force a run; self-triggers respect the throttle
  const force = req.method === "GET";
  const summary = await runAutopilot(force);

  // Morning cron also kicks the AI oracle for event markets (football, world);
  // harmless no-op while the Anthropic account has no credits.
  if (force && new Date().getUTCHours() < 12) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    if (appUrl && secret) {
      fetch(`${appUrl}/api/verdex/oracle`, { headers: { Authorization: `Bearer ${secret}` } }).catch(() => null);
    }
  }

  return noStoreJson(summary, { status: summary.ok ? 200 : 503 });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
