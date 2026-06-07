import { NextRequest } from "next/server";
import { getLeaderboard, isVerdexDbReady } from "@/lib/verdex/db";
import { seedLeaderboard } from "@/lib/verdex/data";
import { isRateLimited, noStoreJson, rateLimitResponse } from "@/lib/serverApi";

export async function GET(req: NextRequest) {
  if (isRateLimited(req, "verdex-leaderboard", 30)) {
    return rateLimitResponse();
  }

  if (!isVerdexDbReady()) {
    return noStoreJson({ ok: true, leaderboard: seedLeaderboard, source: "seed" });
  }

  const leaderboard = await getLeaderboard(20);
  if (!leaderboard) {
    return noStoreJson({ ok: false, error: "Failed to load leaderboard." }, { status: 500 });
  }

  // Fall back to seed data if DB is empty
  if (leaderboard.length === 0) {
    return noStoreJson({ ok: true, leaderboard: seedLeaderboard, source: "seed" });
  }

  return noStoreJson({ ok: true, leaderboard, source: "db" });
}
