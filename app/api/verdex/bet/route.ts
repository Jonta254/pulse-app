import { NextRequest } from "next/server";
import { after } from "next/server";
import { placeBet, isVerdexDbReady } from "@/lib/verdex/db";
import { maybeRewardReferral } from "@/lib/verdex/referrals";
import { isRateLimited, isWalletAddress, noStoreJson, rateLimitResponse, readJsonBody } from "@/lib/serverApi";
import { MAX_BET_WLD } from "@/lib/verdex/utils";

type BetBody = {
  id?: string;
  marketId?: string;
  worldNullifier?: string;
  username?: string;
  position?: "yes" | "no";
  amountWld?: number;
  txReference?: string;
};

export async function POST(req: NextRequest) {
  if (isRateLimited(req, "verdex-bet", 10)) {
    return rateLimitResponse();
  }

  const body = await readJsonBody<BetBody>(req);
  if (!body) {
    return noStoreJson({ error: "Invalid request body." }, { status: 400 });
  }

  const { id, marketId, worldNullifier, username, position, amountWld, txReference } = body;

  if (!id || !marketId || !worldNullifier || !position || !amountWld || !txReference) {
    return noStoreJson({ error: "Missing required bet fields." }, { status: 400 });
  }

  if (!isWalletAddress(worldNullifier)) {
    return noStoreJson({ error: "Invalid nullifier — must be a 0x wallet address." }, { status: 400 });
  }

  if (!["yes", "no"].includes(position)) {
    return noStoreJson({ error: "Position must be yes or no." }, { status: 400 });
  }

  if (amountWld <= 0 || amountWld > MAX_BET_WLD) {
    return noStoreJson({ error: `Bet amount must be between 0.1 and ${MAX_BET_WLD} WLD.` }, { status: 400 });
  }

  if (!isVerdexDbReady()) {
    // DB not yet configured — accept but return pending setup
    return noStoreJson({ ok: true, pendingSetup: true });
  }

  const result = await placeBet({
    id,
    marketId,
    worldNullifier,
    username,
    position,
    amountWld,
    txReference,
  });

  if (!result.ok) {
    return noStoreJson({ ok: false, error: result.error }, { status: 409 });
  }

  // First confirmed bet from an invited human pays their referrer (once)
  after(() => maybeRewardReferral(worldNullifier));

  return noStoreJson({ ok: true });
}
