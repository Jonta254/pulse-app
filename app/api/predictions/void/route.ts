import { NextRequest } from "next/server";
import { voidMarket, isVerdexDbReady } from "@/lib/verdex/db";
import { processQueuedPayouts, notifyPaidWinners } from "@/lib/verdex/payouts";
import { isTreasuryPayoutEnabled } from "@/lib/verdex/treasury";
import { isRateLimited, noStoreJson, rateLimitResponse, readJsonBody } from "@/lib/serverApi";

// POST /api/predictions/void — cancel an unresolvable market and refund every
// stake in full through the treasury rail. CRON_SECRET protected.

export const maxDuration = 300;

type VoidBody = { marketId?: string; reason?: string; secret?: string };

export async function POST(req: NextRequest) {
  if (isRateLimited(req, "predictions-void", 10)) return rateLimitResponse();

  const secret = process.env.CRON_SECRET;
  const body = await readJsonBody<VoidBody>(req);
  if (!body) return noStoreJson({ error: "Invalid request body." }, { status: 400 });

  if (secret) {
    const validHeader = req.headers.get("authorization") === `Bearer ${secret}`;
    if (!validHeader && body.secret !== secret) {
      return noStoreJson({ error: "Unauthorized." }, { status: 401 });
    }
  }

  if (!body.marketId || !body.reason) {
    return noStoreJson({ error: "marketId and reason are required." }, { status: 400 });
  }
  if (!isVerdexDbReady()) {
    return noStoreJson({ ok: false, error: "Database not configured." }, { status: 503 });
  }

  const result = await voidMarket(body.marketId, body.reason);
  if (!result.ok) return noStoreJson({ ok: false, error: result.error }, { status: 400 });

  // Send the refunds immediately when the rail is live
  let refundRun = null;
  if (result.refunds > 0 && isTreasuryPayoutEnabled()) {
    refundRun = await processQueuedPayouts({ limit: 25 });
    if (refundRun.paidWallets.length > 0) await notifyPaidWinners(refundRun.paidWallets, "refund");
  }

  return noStoreJson({ ok: true, marketId: body.marketId, refundsQueued: result.refunds, refundRun });
}
