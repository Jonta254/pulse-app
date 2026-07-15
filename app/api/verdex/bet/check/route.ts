import { NextRequest } from "next/server";
import { checkBetCapacity, isVerdexDbReady } from "@/lib/verdex/db";
import { isRateLimited, noStoreJson, rateLimitResponse, readJsonBody } from "@/lib/serverApi";
import { MAX_BET_WLD } from "@/lib/verdex/utils";

// POST /api/verdex/bet/check — dry-run capacity check, called BEFORE payment
// is initiated. Money must never leave a user's wallet for a bet the
// treasury can't safely cover, so the client calls this first and only opens
// MiniKit.pay() if it returns ok: true.

type CheckBody = {
  marketId?: string;
  position?: "yes" | "no";
  amountWld?: number;
};

export async function POST(req: NextRequest) {
  if (isRateLimited(req, "verdex-bet-check", 20)) {
    return rateLimitResponse();
  }

  const body = await readJsonBody<CheckBody>(req);
  if (!body) {
    return noStoreJson({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const { marketId, position, amountWld } = body;
  if (!marketId || !position || !["yes", "no"].includes(position) || !amountWld) {
    return noStoreJson({ ok: false, error: "Missing required fields." }, { status: 400 });
  }

  if (amountWld <= 0 || amountWld > MAX_BET_WLD) {
    return noStoreJson({ ok: false, error: `Bet amount must be between 0.1 and ${MAX_BET_WLD} WLD.` }, { status: 400 });
  }

  if (!isVerdexDbReady()) {
    // DB not yet configured — nothing to check against, allow through (bet
    // route itself already handles this pendingSetup case at record time).
    return noStoreJson({ ok: true });
  }

  const result = await checkBetCapacity(marketId, position, amountWld);
  if (!result.ok) {
    return noStoreJson({ ok: false, error: result.error }, { status: 409 });
  }
  return noStoreJson({ ok: true });
}
