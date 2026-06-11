import { NextRequest } from "next/server";
import { getPayouts } from "@/lib/verdex/payouts";
import { isRateLimited, isWalletAddress, noStoreJson, rateLimitResponse } from "@/lib/serverApi";

// GET /api/predictions/payouts — payout queue visibility.
//   Admin (Authorization: Bearer CRON_SECRET): full queue, optional ?status=
//   Player: ?nullifier=0x… returns only that wallet's payouts (safe fields)

export async function GET(req: NextRequest) {
  if (isRateLimited(req, "payouts-list", 30)) return rateLimitResponse();

  const secret = process.env.CRON_SECRET;
  const isAdmin = Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`;

  const { searchParams } = new URL(req.url);
  const nullifier = searchParams.get("nullifier") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  if (isAdmin) {
    const rows = await getPayouts({ nullifier, status, limit: 200 });
    if (!rows) return noStoreJson({ ok: false, error: "Database not configured." }, { status: 503 });
    return noStoreJson({ ok: true, count: rows.length, payouts: rows });
  }

  // Player view — requires their own wallet address
  if (!nullifier || !isWalletAddress(nullifier)) {
    return noStoreJson({ error: "nullifier (wallet address) is required." }, { status: 400 });
  }

  const rows = await getPayouts({ nullifier, limit: 50 });
  if (!rows) return noStoreJson({ ok: false, error: "Database not configured." }, { status: 503 });

  const payouts = rows.map((r) => ({
    id: r.id,
    source: r.source,
    marketId: r.market_id,
    amountWld: Number(r.amount_wld),
    status: r.status,
    txHash: r.tx_hash,
    createdAt: r.created_at,
    paidAt: r.paid_at,
  }));

  return noStoreJson({ ok: true, count: payouts.length, payouts });
}
