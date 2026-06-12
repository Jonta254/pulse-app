import { NextRequest } from "next/server";
import { getLeaderboard, isVerdexDbReady } from "@/lib/verdex/db";
import { isRateLimited, noStoreJson, rateLimitResponse } from "@/lib/serverApi";

// Real players only — an empty board is honest; fabricated rankings are not.
export async function GET(req: NextRequest) {
  if (isRateLimited(req, "verdex-leaderboard", 30)) {
    return rateLimitResponse();
  }

  if (!isVerdexDbReady()) {
    return noStoreJson({ ok: true, leaderboard: [], source: "empty" });
  }

  const leaderboard = await getLeaderboard(20);
  if (!leaderboard) {
    return noStoreJson({ ok: false, error: "Failed to load leaderboard." }, { status: 500 });
  }

  return noStoreJson({ ok: true, leaderboard, source: "db" });
}
