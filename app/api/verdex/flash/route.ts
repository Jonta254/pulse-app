// GET /api/verdex/flash — returns the current batch of flash markets (5-min to 1-hr micro markets)
// Flash markets auto-refresh every hour via the oracle cron.
// This endpoint serves the current live flash batch for the UI ticker.
import { NextRequest } from "next/server";
import { after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isRateLimited, noStoreJson, rateLimitResponse } from "@/lib/serverApi";
import type { VerdexMarket } from "@/types/verdex";

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// Hard-coded live flash markets that rotate (fallback if DB not ready)
function getLiveFlashFallback(): VerdexMarket[] {
  const now = new Date();
  const add = (mins: number) => new Date(now.getTime() + mins * 60000).toISOString();
  return [
    {
      id: `flash-btc-${now.getMinutes()}`,
      title: "Will BTC move >0.5% in the next 5 minutes?",
      description: "Binance BTCUSDT spot price. Measured from bet-close time.",
      category: "micro",
      closesAt: add(4),
      resolvesAt: add(5),
      outcome: null,
      yesPool: 0,
      noPool: 0,
      status: "open",
      featured: true,
      aiGenerated: false,
      totalBettors: 0,
    },
    {
      id: `flash-wld-${now.getMinutes()}`,
      title: "Will WLD be up vs 1 hour ago at the top of the hour?",
      description: "Binance WLD/USDT spot. Compares price at bet close to price 1h prior.",
      category: "micro",
      closesAt: add(55),
      resolvesAt: add(60),
      outcome: null,
      yesPool: 0,
      noPool: 0,
      status: "open",
      featured: false,
      aiGenerated: false,
      totalBettors: 0,
    },
    {
      id: `flash-eth-${now.getHours()}`,
      title: "Will ETH gas fees stay below 10 gwei for the next 30 minutes?",
      description: "Etherscan average gas tracker. Must stay below 10 gwei every minute.",
      category: "micro",
      closesAt: add(28),
      resolvesAt: add(30),
      outcome: null,
      yesPool: 0,
      noPool: 0,
      status: "open",
      featured: false,
      aiGenerated: false,
      totalBettors: 0,
    },
  ];
}

export async function GET(req: NextRequest) {
  if (isRateLimited(req, "verdex-flash", 60)) return rateLimitResponse();

  // Self-trigger the autopilot (resolve due markets, pay winners, refill the
  // board) whenever users are active. It self-throttles to one run per 5 min.
  after(async () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const secret = process.env.CRON_SECRET ?? "";
    if (!appUrl) return;
    await fetch(`${appUrl}/api/verdex/auto`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    }).catch(() => null);
  });

  const client = db();
  if (!client) {
    return noStoreJson({ ok: true, markets: getLiveFlashFallback(), source: "fallback" });
  }

  const now = new Date().toISOString();
  // Machine-resolvable data markets only — every flash market must settle
  // itself; stale seed/AI micro markets are excluded
  const { data, error } = await client
    .from("verdex_markets")
    .select("*")
    .eq("status", "open")
    .eq("category", "micro")
    .like("id", "data-v1-%")
    .gt("closes_at", now)
    .order("closes_at", { ascending: true })
    .limit(6);

  if (error || !data || data.length === 0) {
    return noStoreJson({ ok: true, markets: getLiveFlashFallback(), source: "fallback" });
  }

  const markets: VerdexMarket[] = data.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    category: "micro",
    closesAt: row.closes_at,
    resolvesAt: row.resolves_at,
    outcome: row.outcome,
    yesPool: Number(row.yes_pool),
    noPool: Number(row.no_pool),
    status: row.status,
    featured: row.featured,
    aiGenerated: row.ai_generated,
    totalBettors: row.total_bettors,
  }));

  return noStoreJson({ ok: true, markets, source: "db" });
}
