import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { noStoreJson } from "@/lib/serverApi";

// POST /api/predictions/recompute-pools — one-shot integrity repair.
// Rebuilds every open market's yes/no pools and bettor count from REAL
// confirmed bets, wiping any display/seed liquidity that was previously
// written into the pool columns. CRON_SECRET protected.

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return noStoreJson({ error: "Unauthorized." }, { status: 401 });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return noStoreJson({ ok: false, error: "Database not configured." }, { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: markets, error: mErr } = await db
    .from("verdex_markets")
    .select("id")
    .neq("status", "resolved")
    .limit(500);
  if (mErr) return noStoreJson({ ok: false, error: mErr.message }, { status: 500 });

  const { data: bets, error: bErr } = await db
    .from("verdex_bets")
    .select("market_id, position, amount_wld, world_nullifier")
    .eq("confirmed", true);
  if (bErr) return noStoreJson({ ok: false, error: bErr.message }, { status: 500 });

  type BetRow = { market_id: string; position: string; amount_wld: number; world_nullifier: string };
  const byMarket = new Map<string, { yes: number; no: number; bettors: Set<string> }>();
  for (const b of (bets ?? []) as BetRow[]) {
    const agg = byMarket.get(b.market_id) ?? { yes: 0, no: 0, bettors: new Set<string>() };
    if (b.position === "yes") agg.yes += Number(b.amount_wld);
    else agg.no += Number(b.amount_wld);
    agg.bettors.add(b.world_nullifier);
    byMarket.set(b.market_id, agg);
  }

  let updated = 0;
  for (const m of markets ?? []) {
    const agg = byMarket.get(m.id) ?? { yes: 0, no: 0, bettors: new Set<string>() };
    const { error } = await db.from("verdex_markets").update({
      yes_pool: Math.round(agg.yes * 10000) / 10000,
      no_pool: Math.round(agg.no * 10000) / 10000,
      total_bettors: agg.bettors.size,
    }).eq("id", m.id);
    if (!error) updated++;
  }

  return noStoreJson({ ok: true, marketsChecked: markets?.length ?? 0, updated });
}
