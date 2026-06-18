import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isVerdexDbReady } from "@/lib/verdex/db";
import { isRateLimited, noStoreJson, rateLimitResponse, readJsonBody } from "@/lib/serverApi";

function getDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

type ComboPick = {
  marketId: string;
  marketTitle: string;
  category: string;
  position: "yes" | "no";
  oddsLabel: string;
  oddsNum: number;
};

type ComboBody = {
  id?: string;
  worldNullifier?: string;
  username?: string;
  picks?: ComboPick[];
  stakeWld?: number;
  totalOdds?: number;
  projectedPayout?: number;
  txReference?: string;
};

export async function POST(req: NextRequest) {
  if (isRateLimited(req, "verdex-combo", 5)) {
    return rateLimitResponse();
  }

  const body = await readJsonBody<ComboBody>(req);
  if (!body) {
    return noStoreJson({ error: "Invalid request body." }, { status: 400 });
  }

  const { id, worldNullifier, username, picks, stakeWld, totalOdds, projectedPayout, txReference } = body;

  if (!id || !worldNullifier || !picks || picks.length < 2 || !stakeWld || !totalOdds || !projectedPayout) {
    return noStoreJson({ error: "Missing required combo fields." }, { status: 400 });
  }

  if (stakeWld <= 0 || stakeWld > 100) {
    return noStoreJson({ error: "Stake must be between 0.1 and 100 WLD." }, { status: 400 });
  }

  if (picks.length > 5) {
    return noStoreJson({ error: "Maximum 5 picks per combo." }, { status: 400 });
  }

  // Store to Supabase if DB is ready
  const db = getDb();
  if (isVerdexDbReady() && db) {
    const { error } = await db
      .from("verdex_combos")
      .upsert({
        id,
        world_nullifier: worldNullifier,
        username: username ?? null,
        picks: picks,
        stake_wld: stakeWld,
        total_odds: totalOdds,
        projected_payout: projectedPayout,
        tx_reference: txReference ?? null,
        status: "open",
        placed_at: new Date().toISOString(),
      });
    if (error) {
      console.error("[verdex/combo] upsert error:", error.message);
    }
  }

  return noStoreJson({ ok: true, id });
}
