import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isRateLimited, noStoreJson, rateLimitResponse } from "@/lib/serverApi";

// GET /api/verdex/pulse — the live winners ticker. The last real on-chain
// payouts, public proof that VeRdex actually pays. Usernames are already
// public on the leaderboard; wallets are truncated.

type PayoutRow = {
  username: string | null;
  wallet_address: string | null;
  amount_wld: number;
  source: string;
  tx_hash: string | null;
  paid_at: string | null;
};

export async function GET(req: NextRequest) {
  if (isRateLimited(req, "verdex-pulse", 60)) return rateLimitResponse();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return noStoreJson({ ok: true, wins: [] });
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data } = await db
    .from("verdex_payouts")
    .select("username, wallet_address, amount_wld, source, tx_hash, paid_at")
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(8);

  const wins = ((data ?? []) as PayoutRow[]).map((r) => ({
    name: r.username ?? (r.wallet_address ? `${r.wallet_address.slice(0, 6)}…${r.wallet_address.slice(-4)}` : "a human"),
    amountWld: Number(r.amount_wld),
    source: r.source,
    txHash: r.tx_hash,
    paidAt: r.paid_at,
  }));

  return noStoreJson({ ok: true, wins });
}
