import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isRateLimited, noStoreJson, rateLimitResponse } from "@/lib/serverApi";

// GET /api/verdex/pulse — live winners ticker. Real on-chain payouts with
// WorldScan receipts; seed data fills the strip until real wins accumulate.

type PayoutRow = {
  username: string | null;
  wallet_address: string | null;
  amount_wld: number;
  source: string;
  tx_hash: string | null;
  paid_at: string | null;
};

type PulseWin = {
  name: string;
  amountWld: number;
  source: string;
  txHash: string | null;
  paidAt: string | null;
};

const SEED_WINS: PulseWin[] = [
  { name: "@ravi_j",    amountWld: 3.20, source: "market",   txHash: null, paidAt: null },
  { name: "@amara_k",   amountWld: 1.80, source: "market",   txHash: null, paidAt: null },
  { name: "@chidi_n",   amountWld: 5.40, source: "clash",    txHash: null, paidAt: null },
  { name: "@sofia_l",   amountWld: 2.10, source: "market",   txHash: null, paidAt: null },
  { name: "@taro_k",    amountWld: 0.90, source: "referral", txHash: null, paidAt: null },
  { name: "@maya_h",    amountWld: 4.50, source: "goal",     txHash: null, paidAt: null },
  { name: "@jayden_b",  amountWld: 1.60, source: "market",   txHash: null, paidAt: null },
  { name: "@nadia_p",   amountWld: 7.20, source: "clash",    txHash: null, paidAt: null },
];

export async function GET(req: NextRequest) {
  if (isRateLimited(req, "verdex-pulse", 60)) return rateLimitResponse();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return noStoreJson({ ok: true, wins: SEED_WINS, seeded: true });
  }

  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data } = await db
    .from("verdex_payouts")
    .select("username, wallet_address, amount_wld, source, tx_hash, paid_at")
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(12);

  const wins = ((data ?? []) as PayoutRow[]).map((r) => ({
    name: r.username ?? (r.wallet_address ? `${r.wallet_address.slice(0, 6)}…${r.wallet_address.slice(-4)}` : "a human"),
    amountWld: Number(r.amount_wld),
    source: r.source,
    txHash: r.tx_hash,
    paidAt: r.paid_at,
  }));

  if (wins.length === 0) {
    return noStoreJson({ ok: true, wins: SEED_WINS, seeded: true });
  }

  return noStoreJson({ ok: true, wins, seeded: false });
}
