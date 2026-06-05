import { NextRequest } from "next/server";
import { resolveMarket, getBetNullifiers, isPulseDbReady } from "@/lib/pulse/db";
import { isRateLimited, noStoreJson, rateLimitResponse, readJsonBody } from "@/lib/serverApi";

const RESOLVE_SECRET = process.env.CRON_SECRET;

type ResolveBody = {
  marketId?: string;
  outcome?: "yes" | "no";
  secret?: string;
};

export async function POST(req: NextRequest) {
  if (isRateLimited(req, "pulse-resolve", 10)) {
    return rateLimitResponse();
  }

  const body = await readJsonBody<ResolveBody>(req);
  if (!body) return noStoreJson({ error: "Invalid request body." }, { status: 400 });

  const { marketId, outcome, secret } = body;

  // Require admin secret
  if (RESOLVE_SECRET && secret !== RESOLVE_SECRET) {
    return noStoreJson({ error: "Unauthorized." }, { status: 401 });
  }

  if (!marketId || !outcome) {
    return noStoreJson({ error: "marketId and outcome are required." }, { status: 400 });
  }

  if (!["yes", "no"].includes(outcome)) {
    return noStoreJson({ error: "outcome must be yes or no." }, { status: 400 });
  }

  if (!isPulseDbReady()) {
    return noStoreJson({ ok: false, error: "Database not configured." }, { status: 503 });
  }

  // Collect bettors before resolving (for notifications)
  const nullifiers = await getBetNullifiers(marketId);

  const result = await resolveMarket(marketId, outcome);
  if (!result.ok) {
    return noStoreJson({ ok: false, error: result.error }, { status: 400 });
  }

  // Fire-and-forget notifications to all bettors
  if (nullifiers.length > 0) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    fetch(`${appUrl}/api/pulse/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        marketId,
        outcome,
        nullifiers,
        secret,
      }),
    }).catch(() => null);
  }

  return noStoreJson({ ok: true, payouts: result.payouts, outcome });
}
