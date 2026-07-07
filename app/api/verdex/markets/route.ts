import { NextRequest } from "next/server";
import { getOpenMarkets, isVerdexDbReady, upsertMarkets } from "@/lib/verdex/db";
import { seedMarkets } from "@/lib/verdex/data";
import { isRateLimited, noStoreJson, rateLimitResponse } from "@/lib/serverApi";

// Track whether we've synced this deployment's seed markets into DB
let seedSynced = false;

// Track last oracle trigger time to avoid spamming it
let lastOracleTrigger = 0;
const ORACLE_THROTTLE_MS = 20 * 60 * 1000; // 20 min between auto-triggers

/**
 * Fire the oracle in the background (non-blocking) when markets are stale.
 * Only triggers if CRON_SECRET is not set (so we don't need auth in auto mode)
 * or if we include it ourselves.
 */
async function triggerOracleIfStale(appUrl: string) {
  const now = Date.now();
  if (now - lastOracleTrigger < ORACLE_THROTTLE_MS) return;
  lastOracleTrigger = now;

  const secret = process.env.CRON_SECRET;
  const headers: Record<string, string> = secret ? { Authorization: `Bearer ${secret}` } : {};

  // Fire and forget — don't await
  fetch(`${appUrl}/api/verdex/oracle`, { headers, cache: "no-store" })
    .catch(() => null);
}

export async function GET(req: NextRequest) {
  if (isRateLimited(req, "verdex-markets", 60)) {
    return rateLimitResponse();
  }

  const VALID_CATEGORIES = new Set(["all", "crypto", "sports", "world", "culture", "micro"]);
  const rawCategory = req.nextUrl.searchParams.get("category") ?? "all";
  const category = VALID_CATEGORIES.has(rawCategory) ? rawCategory : "all";
  const forceReseed = req.nextUrl.searchParams.get("reseed") === "1";

  if (!isVerdexDbReady()) {
    // DB not configured — return seed data so UI works immediately
    const filtered = category === "all"
      ? seedMarkets
      : seedMarkets.filter((m) => m.category === category);
    return noStoreJson({ ok: true, markets: filtered, source: "seed" });
  }

  // On first request of this deployment, upsert ALL seed markets into DB.
  // upsertMarkets uses onConflict:'id' so existing bets/pools are preserved —
  // only new market IDs get inserted.
  if (!seedSynced || forceReseed) {
    seedSynced = true;
    await upsertMarkets(seedMarkets);
  }

  const markets = await getOpenMarkets(category === "all" ? undefined : category);
  if (!markets) {
    return noStoreJson({ ok: false, error: "Failed to load markets." }, { status: 500 });
  }

  // Auto-trigger oracle if DB is running low — any user visit can top up markets
  if (markets.length < 18) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host") ?? ""}`;
    void triggerOracleIfStale(appUrl);
  }

  return noStoreJson({ ok: true, markets, source: "db", total: markets.length });
}
