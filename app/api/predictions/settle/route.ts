import { NextRequest } from "next/server";
import { resolveMarket, getBetNullifiers, isVerdexDbReady } from "@/lib/verdex/db";
import { processQueuedPayouts, notifyPaidWinners } from "@/lib/verdex/payouts";
import { isTreasuryPayoutEnabled } from "@/lib/verdex/treasury";
import { isRateLimited, noStoreJson, rateLimitResponse, readJsonBody } from "@/lib/serverApi";

// POST /api/predictions/settle — closes/settles a market, queues winner
// payouts, and (when the treasury rail is enabled) immediately sends them.
// Protected by CRON_SECRET (Authorization header or body secret).

export const maxDuration = 300;

type SettleBody = {
  marketId?: string;
  outcome?: "yes" | "no";
  secret?: string;
  processNow?: boolean;
};

export async function POST(req: NextRequest) {
  if (isRateLimited(req, "predictions-settle", 10)) return rateLimitResponse();

  const secret = process.env.CRON_SECRET;
  const body = await readJsonBody<SettleBody>(req);
  if (!body) return noStoreJson({ error: "Invalid request body." }, { status: 400 });

  if (secret) {
    const validHeader = req.headers.get("authorization") === `Bearer ${secret}`;
    if (!validHeader && body.secret !== secret) {
      return noStoreJson({ error: "Unauthorized." }, { status: 401 });
    }
  }

  const { marketId, outcome } = body;
  if (!marketId || !outcome || !["yes", "no"].includes(outcome)) {
    return noStoreJson({ error: "marketId and outcome (yes|no) are required." }, { status: 400 });
  }
  if (!isVerdexDbReady()) {
    return noStoreJson({ ok: false, error: "Database not configured." }, { status: 503 });
  }

  const nullifiers = await getBetNullifiers(marketId);

  const result = await resolveMarket(marketId, outcome);
  if (!result.ok) return noStoreJson({ ok: false, error: result.error }, { status: 400 });

  // Notify all bettors that the market resolved
  if (nullifiers.length > 0) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    fetch(`${appUrl}/api/verdex/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret ?? ""}` },
      body: JSON.stringify({ marketId, outcome, marketTitle: marketId, nullifiers }),
    }).catch(() => null);
  }

  // Chain the treasury processor so winners are paid in the same run
  // (Hobby plan is capped at 2 crons, so settle drives the payout rail)
  let payoutRun = null;
  if (body.processNow !== false && isTreasuryPayoutEnabled()) {
    payoutRun = await processQueuedPayouts({ limit: 25 });
    await notifyPaidWinners(payoutRun.paidWallets);
  }

  return noStoreJson({
    ok: true,
    marketId,
    outcome,
    settledBets: result.payouts,
    queuedPayouts: result.queued ?? 0,
    treasuryRun: payoutRun,
  });
}
