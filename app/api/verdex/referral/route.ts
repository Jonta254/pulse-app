import { NextRequest } from "next/server";
import { recordReferral, getReferralStats } from "@/lib/verdex/referrals";
import { isRateLimited, isWalletAddress, noStoreJson, rateLimitResponse, readJsonBody } from "@/lib/serverApi";

// POST /api/verdex/referral { referrer, referee } — recorded once per invitee,
// only for brand-new users. GET ?nullifier=0x… — referrer's stats.

export async function POST(req: NextRequest) {
  if (isRateLimited(req, "verdex-referral", 10)) return rateLimitResponse();

  const body = await readJsonBody<{ referrer?: string; referee?: string }>(req);
  if (!body?.referrer || !body?.referee) {
    return noStoreJson({ error: "referrer and referee are required." }, { status: 400 });
  }

  const result = await recordReferral(body.referrer, body.referee);
  // Always 200 — the client fires this in the background and never blocks on it
  return noStoreJson(result);
}

export async function GET(req: NextRequest) {
  if (isRateLimited(req, "verdex-referral-stats", 30)) return rateLimitResponse();

  const nullifier = new URL(req.url).searchParams.get("nullifier") ?? "";
  if (!isWalletAddress(nullifier)) {
    return noStoreJson({ error: "nullifier (wallet address) is required." }, { status: 400 });
  }

  const stats = await getReferralStats(nullifier);
  if (!stats) return noStoreJson({ ok: false, error: "Database not configured." }, { status: 503 });
  return noStoreJson({ ok: true, ...stats });
}
