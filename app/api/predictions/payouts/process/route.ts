import { NextRequest } from "next/server";
import { processQueuedPayouts, notifyPaidWinners } from "@/lib/verdex/payouts";
import { getTreasuryStatus, getTreasuryWarnings, isTreasuryPayoutEnabled, treasuryDisabledReason } from "@/lib/verdex/treasury";
import { isRateLimited, noStoreJson, rateLimitResponse, readJsonBody } from "@/lib/serverApi";

// POST /api/predictions/payouts/process — sends queued WLD payouts on World
// Chain from the treasury signer. Disabled unless TREASURY_PAYOUT_ENABLED=true
// and TREASURY_PAYOUT_PRIVATE_KEY is set. Protected by CRON_SECRET.

export const maxDuration = 300;

type ProcessBody = {
  secret?: string;
  limit?: number;
  retryFailed?: boolean;
};

export async function POST(req: NextRequest) {
  if (isRateLimited(req, "payouts-process", 6)) return rateLimitResponse();

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return noStoreJson({ ok: false, error: "CRON_SECRET is not configured." }, { status: 503 });
  }

  const body = (await readJsonBody<ProcessBody>(req)) ?? {};
  const validHeader = req.headers.get("authorization") === `Bearer ${secret}`;
  if (!validHeader && body.secret !== secret) {
    return noStoreJson({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isTreasuryPayoutEnabled()) {
    return noStoreJson({ ok: false, enabled: false, error: `Treasury payouts disabled: ${treasuryDisabledReason()}` }, { status: 503 });
  }

  const summary = await processQueuedPayouts({
    limit: body.limit,
    retryFailed: body.retryFailed === true,
  });

  if (summary.paidWallets.length > 0) {
    await notifyPaidWinners(summary.paidWallets);
  }

  const status = summary.ok ? 200 : 502;
  return noStoreJson(summary, { status });
}

// GET — treasury health check (CRON_SECRET protected)
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return noStoreJson({ error: "Unauthorized." }, { status: 401 });
  }

  const enabled = isTreasuryPayoutEnabled();
  const treasury = enabled ? await getTreasuryStatus() : null;
  return noStoreJson({
    ok: true,
    enabled,
    reason: enabled ? undefined : treasuryDisabledReason(),
    treasury,
    warnings: treasury ? getTreasuryWarnings(treasury) : [],
  });
}
