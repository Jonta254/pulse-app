import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTreasuryStatus } from "@/lib/verdex/treasury";
import { noStoreJson } from "@/lib/serverApi";

// GET /api/predictions/revenue — owner's profit dashboard. CRON_SECRET only.
// safeWithdrawWld = treasury WLD − every WLD the app could still owe players:
//   open stakes (worst case the whole pool returns to winners) + queued/
//   processing/failed payouts not yet on-chain.

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return noStoreJson({ error: "Unauthorized." }, { status: 401 });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return noStoreJson({ ok: false, error: "Database not configured." }, { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false } });

  const [treasury, openBets, owedPayouts, paidStats] = await Promise.all([
    getTreasuryStatus(),
    db.from("verdex_bets").select("amount_wld").eq("confirmed", true).eq("paid_out", false),
    db.from("verdex_payouts").select("amount_wld, status").in("status", ["queued", "processing", "awaiting_wallet", "failed"]),
    db.from("verdex_payouts").select("amount_wld").eq("status", "paid"),
  ]);

  const sum = (rows: Array<{ amount_wld: number }> | null) =>
    Math.round((rows ?? []).reduce((s, r) => s + Number(r.amount_wld), 0) * 10000) / 10000;

  const openStakesWld = sum(openBets.data as Array<{ amount_wld: number }>);
  const owedPayoutsWld = sum(owedPayouts.data as Array<{ amount_wld: number }>);
  const lifetimePaidWld = sum(paidStats.data as Array<{ amount_wld: number }>);

  const wld = treasury?.wldBalance ?? 0;
  const safeWithdrawWld = Math.max(0, Math.round((wld - openStakesWld - owedPayoutsWld) * 10000) / 10000);

  return noStoreJson({
    ok: true,
    treasury,
    openStakesWld,
    owedPayoutsWld,
    lifetimePaidWld,
    safeWithdrawWld,
    note: "safeWithdrawWld keeps every possible player claim covered. Withdrawing more risks failed payouts.",
  });
}
