import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isRateLimited, isWalletAddress, noStoreJson, rateLimitResponse } from "@/lib/serverApi";

// GET /api/verdex/bets?nullifier=0x… — a player's own bets with server truth:
// settled state, payout, and the market's resolved outcome. Used by My Bets to
// sync local state so won/lost/refunded always reflects reality.

type BetRow = {
  id: string;
  market_id: string;
  position: string;
  amount_wld: number;
  payout_wld: number | null;
  settled: boolean;
  created_at: string;
  verdex_markets: { title: string; status: string; outcome: string | null } | null;
};

export async function GET(req: NextRequest) {
  if (isRateLimited(req, "verdex-bets", 30)) return rateLimitResponse();

  const { searchParams } = new URL(req.url);
  const nullifier = searchParams.get("nullifier") ?? "";
  if (!isWalletAddress(nullifier)) {
    return noStoreJson({ error: "nullifier (wallet address) is required." }, { status: 400 });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return noStoreJson({ ok: false, error: "Database not configured." }, { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await db
    .from("verdex_bets")
    .select("id, market_id, position, amount_wld, payout_wld, settled, created_at, verdex_markets(title, status, outcome)")
    .eq("world_nullifier", nullifier)
    .eq("confirmed", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return noStoreJson({ ok: false, error: "Failed to fetch bets." }, { status: 500 });

  const bets = ((data ?? []) as unknown as BetRow[]).map((r) => ({
    id: r.id,
    marketId: r.market_id,
    marketTitle: r.verdex_markets?.title ?? "Market",
    marketStatus: r.verdex_markets?.status ?? "open",
    marketOutcome: r.verdex_markets?.outcome ?? null,
    position: r.position as "yes" | "no",
    amountWld: Number(r.amount_wld),
    payout: r.payout_wld != null ? Number(r.payout_wld) : undefined,
    settled: r.settled,
    placedAt: r.created_at,
  }));

  return noStoreJson({ ok: true, count: bets.length, bets });
}
