import { NextRequest } from "next/server";
import { getOpenMarkets, isPulseDbReady } from "@/lib/pulse/db";
import { seedMarkets } from "@/lib/pulse/data";
import { isRateLimited, noStoreJson, rateLimitResponse } from "@/lib/serverApi";

export async function GET(req: NextRequest) {
  if (isRateLimited(req, "pulse-markets", 60)) {
    return rateLimitResponse();
  }

  const category = req.nextUrl.searchParams.get("category") ?? "all";

  if (!isPulseDbReady()) {
    // Return seed data so UI works before Supabase is configured
    const filtered = category === "all"
      ? seedMarkets
      : seedMarkets.filter((m) => m.category === category);
    return noStoreJson({ ok: true, markets: filtered, source: "seed" });
  }

  const markets = await getOpenMarkets(category === "all" ? undefined : category);
  if (!markets) {
    return noStoreJson({ ok: false, error: "Failed to load markets." }, { status: 500 });
  }

  // Seed markets into DB on first run if empty
  if (markets.length === 0) {
    const { upsertMarkets } = await import("@/lib/pulse/db");
    await upsertMarkets(seedMarkets);
    return noStoreJson({ ok: true, markets: seedMarkets, source: "seeded" });
  }

  return noStoreJson({ ok: true, markets, source: "db" });
}
