import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveMarket } from "@/lib/verdex/db";
import { generateDataMarkets, parseDataMarketId, resolveDataMarketOutcome } from "@/lib/verdex/dataOracle";
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
    const parsed = parseDataMarketId(m.id);
    if (!parsed) { unresolvable++; continue; }
    const outcome = await resolveDataMarketOutcome(parsed);
    if (!outcome) { unresolvable++; continue; } // candle not available yet — retry next run
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
  const [{ count: flashOpen }, { count: dailyOpen }] = await Promise.all([
    db.from("verdex_markets").select("id", { count: "exact", head: true })
      .eq("status", "open").eq("category", "micro").gt("closes_at", nowIso),
    db.from("verdex_markets").select("id", { count: "exact", head: true })
      .eq("status", "open").eq("category", "crypto").like("id", "data-v1-%").gt("closes_at", nowIso),
  ]);

  const flashNeeded = Math.max(0, FLASH_TARGET - (flashOpen ?? 0));
  const dailyNeeded = Math.max(0, DAILY_TARGET - (dailyOpen ?? 0));
  let generated = 0;
  if (flashNeeded > 0 || dailyNeeded > 0) {
    const fresh = await generateDataMarkets({ flash: flashNeeded, daily: dailyNeeded });
    if (fresh.length > 0 && (await upsertMarkets(fresh))) generated = fresh.length;
  }

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
