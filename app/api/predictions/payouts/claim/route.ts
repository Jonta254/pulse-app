import { NextRequest } from "next/server";
import { getPayouts, processQueuedPayouts, notifyPaidWinners } from "@/lib/verdex/payouts";
import { isTreasuryPayoutEnabled } from "@/lib/verdex/treasury";
import { isRateLimited, isWalletAddress, noStoreJson, rateLimitResponse, readJsonBody } from "@/lib/serverApi";

// POST /api/predictions/payouts/claim — winner-initiated instant payout.
// Funds can only ever go to the SIWE-verified wallet that placed the bet
// (world_nullifier IS that wallet), so triggering a claim cannot redirect
// anyone else's winnings — worst case it pays the rightful winner sooner.

export const maxDuration = 120;

type ClaimBody = { nullifier?: string };

export async function POST(req: NextRequest) {
  if (isRateLimited(req, "payouts-claim", 5)) return rateLimitResponse();

  const body = await readJsonBody<ClaimBody>(req);
  if (!body?.nullifier || !isWalletAddress(body.nullifier)) {
    return noStoreJson({ error: "A valid wallet address is required." }, { status: 400 });
  }

  const queued = await getPayouts({ nullifier: body.nullifier, status: "queued", limit: 25 });
  if (queued === null) return noStoreJson({ ok: false, error: "Database not configured." }, { status: 503 });

  if (queued.length === 0) {
    return noStoreJson({ ok: true, claimed: 0, message: "No claimable winnings right now." });
  }

  if (!isTreasuryPayoutEnabled()) {
    const total = queued.reduce((s, r) => s + Number(r.amount_wld), 0);
    return noStoreJson({
      ok: true,
      claimed: 0,
      pending: queued.length,
      totalWld: Math.round(total * 10000) / 10000,
      message: "Winnings are queued. The treasury will distribute them shortly.",
    });
  }

  const summary = await processQueuedPayouts({ nullifier: body.nullifier, limit: 10 });
  if (summary.paidWallets.length > 0) {
    await notifyPaidWinners(summary.paidWallets);
  }

  return noStoreJson({
    ok: summary.ok,
    claimed: summary.paid,
    failed: summary.failed,
    results: summary.results.map((r) => ({ status: r.status, txHash: r.txHash })),
    error: summary.error,
  });
}
