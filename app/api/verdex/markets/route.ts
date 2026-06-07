import { NextRequest } from "next/server";
import { getOpenMarkets, isVerdexDbReady, upsertMarkets } from "@/lib/verdex/db";
import { seedMarkets } from "@/lib/verdex/data";
import { isRateLimited, noStoreJson, rateLimitResponse } from "@/lib/serverApi";

// Track whether we've synced this deployment's seed markets into DB
let seedSynced = false;

export async function GET(req: NextRequest) {
  if (isRateLimited(req, "verdex-markets", 60)) {
    return rateLimitResponse();
  }

  const category = req.nextUrl.searchParams.get("category") ?? "all";
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

  return noStoreJson({ ok: true, markets, source: "db", total: markets.length });
}
