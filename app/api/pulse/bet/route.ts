import { NextRequest } from "next/server";
import { placeBet, isPulseDbReady } from "@/lib/pulse/db";
import { isRateLimited, noStoreJson, rateLimitResponse, readJsonBody } from "@/lib/serverApi";

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
  if (isRateLimited(req, "pulse-bet", 10)) {
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

  if (!["yes", "no"].includes(position)) {
    return noStoreJson({ error: "Position must be yes or no." }, { status: 400 });
  }

  if (amountWld <= 0 || amountWld > 100) {
    return noStoreJson({ error: "Bet amount must be between 0.1 and 100 WLD." }, { status: 400 });
  }

  if (!isPulseDbReady()) {
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

  return noStoreJson({ ok: true });
}
