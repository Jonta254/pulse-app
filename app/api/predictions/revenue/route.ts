import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTreasuryStatus, getTreasuryWarnings } from "@/lib/verdex/treasury";
import { getOpenMarketsExposureWld } from "@/lib/verdex/db";
import { getOwedPayoutsWld } from "@/lib/verdex/payouts";
import { noStoreJson } from "@/lib/serverApi";

// GET /api/predictions/revenue — owner's profit dashboard. CRON_SECRET only.
// Flat 2x payout model: a market's worst-case liability is |yesPool - noPool|
// (openMarketsExposureWld), not the whole pool — a balanced market breaks
// exactly even. safeWithdrawWld = treasury WLD − that exposure − payouts
// already queued/processing/failed (owedPayoutsWld).

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return noStoreJson({ error: "Unauthorized." }, { status: 401 });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return noStoreJson({ ok: false, error: "Database not configured." }, { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false } });

  const [treasury, openBets, openMarketsExposureWld, owedPayoutsWld, paidStats] = await Promise.all([
    getTreasuryStatus(),
    db.from("verdex_bets").select("amount_wld").eq("confirmed", true).eq("paid_out", false),
    getOpenMarketsExposureWld(),
    getOwedPayoutsWld(),
    db.from("verdex_payouts").select("amount_wld").eq("status", "paid"),
  ]);

  const sum = (rows: Array<{ amount_wld: number }> | null) =>
    Math.round((rows ?? []).reduce((s, r) => s + Number(r.amount_wld), 0) * 10000) / 10000;

  const openStakesWld = sum(openBets.data as Array<{ amount_wld: number }>);
  const lifetimePaidWld = sum(paidStats.data as Array<{ amount_wld: number }>);

  const wld = treasury?.wldBalance ?? 0;
  const safeWithdrawWld = Math.max(0, Math.round((wld - openMarketsExposureWld - owedPayoutsWld) * 10000) / 10000);

  return noStoreJson({
    ok: true,
    treasury,
    openStakesWld,
    openMarketsExposureWld: Math.round(openMarketsExposureWld * 10000) / 10000,
    owedPayoutsWld,
    lifetimePaidWld,
    safeWithdrawWld,
    warnings: treasury ? getTreasuryWarnings(treasury) : [],
    note: "safeWithdrawWld keeps the flat-2x worst-case exposure (|yesPool-noPool| per open market) plus queued payouts covered. openStakesWld is total money still in play (informational only). Withdrawing more than safeWithdrawWld risks failed payouts.",
  });
}
