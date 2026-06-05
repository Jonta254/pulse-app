import { NextRequest } from "next/server";
import { getLeaderboard, isPulseDbReady } from "@/lib/pulse/db";
import { seedLeaderboard } from "@/lib/pulse/data";
import { isRateLimited, noStoreJson, rateLimitResponse } from "@/lib/serverApi";

export async function GET(req: NextRequest) {
  if (isRateLimited(req, "pulse-leaderboard", 30)) {
    return rateLimitResponse();
  }

  if (!isPulseDbReady()) {
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
