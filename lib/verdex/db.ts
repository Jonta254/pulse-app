import { createClient } from "@supabase/supabase-js";
import type { VerdexMarket, VerdexGoal, VerdexLeaderEntry, VerdexClash } from "@/types/verdex";
import { queuePayouts, getOwedPayoutsWld, type PayoutQueueEntry } from "./payouts";
import { getTreasuryStatus } from "./treasury";
import { FLAT_PAYOUT_MULTIPLIER } from "./utils";

// ── Supabase client (server-side only, service role) ─────────────────────────

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function isVerdexDbReady(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// ── Market row type (matches verdex_markets table) ────────────────────────────

type MarketRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  closes_at: string;
  resolves_at: string;
  outcome: string | null;
  yes_pool: number;
  no_pool: number;
  status: string;
  featured: boolean;
  ai_generated: boolean;
  total_bettors: number;
  created_at: string;
};

function rowToMarket(row: MarketRow): VerdexMarket {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    category: row.category as VerdexMarket["category"],
    closesAt: row.closes_at,
    resolvesAt: row.resolves_at,
    outcome: (row.outcome as "yes" | "no" | null) ?? null,
    yesPool: Number(row.yes_pool),
    noPool: Number(row.no_pool),
    status: row.status as VerdexMarket["status"],
    featured: row.featured,
    aiGenerated: row.ai_generated,
    totalBettors: row.total_bettors,
  };
}

// ── Markets ───────────────────────────────────────────────────────────────────

// Generous ceiling, not a real page size — every category query (and the
// "all" aggregate) was silently truncating at the old limit of 40, which
// made markets past the 40th invisible with no error or indication anywhere.
// This guards only against a genuine runaway (e.g. a broken generator loop),
// not against the app's real scale.
const MAX_OPEN_MARKETS_QUERY = 500;

export async function getOpenMarkets(category?: string): Promise<VerdexMarket[] | null> {
  const db = getSupabaseClient();
  if (!db) return null;

  let query = db
    .from("verdex_markets")
    .select("*")
    .eq("status", "open")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(MAX_OPEN_MARKETS_QUERY);

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) { console.error("[verdex/db] getOpenMarkets:", error.message); return null; }
  return (data as MarketRow[]).map(rowToMarket);
}

export async function upsertMarkets(markets: VerdexMarket[]): Promise<boolean> {
  const db = getSupabaseClient();
  if (!db) return false;

  const rows = markets.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description ?? null,
    category: m.category,
    closes_at: m.closesAt,
    resolves_at: m.resolvesAt,
    outcome: m.outcome ?? null,
    yes_pool: m.yesPool,
    no_pool: m.noPool,
    status: m.status,
    featured: m.featured ?? false,
    ai_generated: m.aiGenerated ?? false,
    total_bettors: m.totalBettors ?? 0,
  }));

  const { error } = await db.from("verdex_markets").upsert(rows, { onConflict: "id" });
  if (error) { console.error("[verdex/db] upsertMarkets:", error.message); return false; }
  return true;
}

// ── Bets ──────────────────────────────────────────────────────────────────────

// Under flat 2x payouts, a market's worst-case liability is |yesPool - noPool|
// — a perfectly balanced market breaks exactly even (2x the smaller side is
// covered by both sides combined); an imbalanced one needs the treasury to
// cover the gap. Sum across every open market for the conservative worst case
// where every market breaks maximally against the house at once.
export async function getOpenMarketsExposureWld(excludeMarketId?: string): Promise<number> {
  const db = getSupabaseClient();
  if (!db) return 0;
  // Explicit limit — this feeds a safety check, so it must never silently
  // undercount via an implicit default row cap.
  const { data } = await db.from("verdex_markets").select("id, yes_pool, no_pool").eq("status", "open").limit(MAX_OPEN_MARKETS_QUERY);
  return (data ?? [])
    .filter((m) => m.id !== excludeMarketId)
    .reduce((s, m) => s + Math.abs(Number(m.yes_pool) - Number(m.no_pool)), 0);
}

// Read-only capacity check — call BEFORE a bet's payment is initiated (money
// must never move before we know the treasury can cover it) and again at
// record time for an audit-trail warning (never to reject already-paid money).
export async function checkBetCapacity(
  marketId: string,
  position: "yes" | "no",
  amountWld: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getSupabaseClient();
  if (!db) return { ok: false, error: "Database not configured." };

  const { data: market } = await db.from("verdex_markets").select("yes_pool, no_pool").eq("id", marketId).single();
  if (!market) return { ok: false, error: "Market not found." };

  const treasury = await getTreasuryStatus();
  if (!treasury) return { ok: false, error: "Treasury not configured — betting is paused." };

  const [otherExposure, owed] = await Promise.all([
    getOpenMarketsExposureWld(marketId),
    getOwedPayoutsWld(),
  ]);

  const curYes = Number(market.yes_pool);
  const curNo = Number(market.no_pool);
  const newYes = position === "yes" ? curYes + amountWld : curYes;
  const newNo  = position === "no"  ? curNo  + amountWld : curNo;
  const thisMarketExposure = Math.abs(newYes - newNo);

  const projected = otherExposure + thisMarketExposure + owed;
  if (projected > treasury.wldBalance) {
    return {
      ok: false,
      error: "Betting is temporarily paused on this side — the treasury can't safely cover a larger imbalance right now. Try the other side or a smaller stake.",
    };
  }
  return { ok: true };
}

export async function placeBet(bet: {
  id: string;
  marketId: string;
  worldNullifier: string;
  username?: string;
  position: "yes" | "no";
  amountWld: number;
  txReference: string;
}): Promise<{ ok: boolean; error?: string }> {
  const db = getSupabaseClient();
  if (!db) return { ok: false, error: "Database not configured." };

  // Check market is still open
  const { data: market, error: mErr } = await db
    .from("verdex_markets")
    .select("id, status, closes_at")
    .eq("id", bet.marketId)
    .single();

  if (mErr || !market) return { ok: false, error: "Market not found." };
  if (market.status !== "open") return { ok: false, error: "Market is closed." };
  if (new Date(market.closes_at) < new Date()) return { ok: false, error: "Market betting has closed." };

  // The real capacity gate runs BEFORE payment (see /api/verdex/bet/check).
  // By this point the user's WLD has already left their wallet for the
  // treasury, so this is a warning-only audit trail — never reject money
  // that's already been paid, just flag the rare race-condition overage.
  const capacity = await checkBetCapacity(bet.marketId, bet.position, bet.amountWld);
  if (!capacity.ok) {
    console.warn(`[verdex/db] placeBet: capacity exceeded after payment for bet ${bet.id} on market ${bet.marketId} — ${capacity.error}`);
  }

  // Insert bet
  const { error: betErr } = await db.from("verdex_bets").insert({
    id: bet.id,
    market_id: bet.marketId,
    world_nullifier: bet.worldNullifier,
    username: bet.username ?? null,
    position: bet.position,
    amount_wld: bet.amountWld,
    tx_reference: bet.txReference,
    confirmed: true,
  });

  if (betErr) {
    if (betErr.code === "23505") return { ok: false, error: "You already have a bet on this market." };
    console.error("[verdex/db] placeBet:", betErr.message);
    return { ok: false, error: "Failed to record bet." };
  }

  // Update market pools
  const { data: currentMarket } = await db
    .from("verdex_markets")
    .select("yes_pool, no_pool, total_bettors")
    .eq("id", bet.marketId)
    .single();

  if (currentMarket) {
    await db.from("verdex_markets").update({
      yes_pool: bet.position === "yes" ? Number(currentMarket.yes_pool) + bet.amountWld : Number(currentMarket.yes_pool),
      no_pool: bet.position === "no" ? Number(currentMarket.no_pool) + bet.amountWld : Number(currentMarket.no_pool),
      total_bettors: Number(currentMarket.total_bettors) + 1,
    }).eq("id", bet.marketId);
  }

  // Upsert player stats
  await updatePlayerStats(bet.worldNullifier, bet.username, bet.amountWld);

  return { ok: true };
}

async function updatePlayerStats(nullifier: string, username: string | undefined, wagered: number) {
  const db = getSupabaseClient();
  if (!db) return;

  const { data: existing } = await db
    .from("verdex_player_stats")
    .select("total_bets, total_wagered")
    .eq("world_nullifier", nullifier)
    .single();

  await db.from("verdex_player_stats").upsert({
    world_nullifier: nullifier,
    username: username ?? null,
    total_bets: (existing?.total_bets ?? 0) + 1,
    total_wagered: Number(existing?.total_wagered ?? 0) + wagered,
    updated_at: new Date().toISOString(),
  }, { onConflict: "world_nullifier" });
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

type StatsRow = {
  world_nullifier: string;
  username: string | null;
  total_bets: number;
  total_wagered: number;
  total_won: number;
  win_streak: number;
  best_streak: number;
  specialty: string;
};

export async function getLeaderboard(limit = 20): Promise<VerdexLeaderEntry[] | null> {
  const db = getSupabaseClient();
  if (!db) return null;

  const { data, error } = await db
    .from("verdex_player_stats")
    .select("*")
    .order("total_won", { ascending: false })
    .limit(limit);

  if (error) { console.error("[verdex/db] getLeaderboard:", error.message); return null; }

  return (data as StatsRow[]).map((row, i) => ({
    rank: i + 1,
    username: row.username ?? `@human_${row.world_nullifier.slice(0, 6)}`,
    initial: (row.username ?? "H").replace(/^@/, "").charAt(0).toUpperCase(),
    winRate: row.total_wagered > 0 ? Math.round((Number(row.total_won) / Number(row.total_wagered)) * 100) : 0,
    totalBets: row.total_bets,
    totalWonWld: Math.round(Number(row.total_won) * 100) / 100,
    streak: row.win_streak,
    specialty: row.specialty,
    badge: i === 0 ? "🏆" : i === 1 ? "🥈" : i === 2 ? "🥉" : undefined,
  }));
}

// ── Goals ─────────────────────────────────────────────────────────────────────

type GoalRow = {
  id: string;
  owner_nullifier: string;
  title: string;
  description: string | null;
  deadline: string;
  stake_wld: number;
  yes_pool: number;
  no_pool: number;
  status: string;
  evidence: string | null;
  created_at: string;
};

function rowToGoal(row: GoalRow): VerdexGoal {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    deadline: row.deadline,
    stakeWld: Number(row.stake_wld),
    yesPool: Number(row.yes_pool),
    noPool: Number(row.no_pool),
    status: row.status as VerdexGoal["status"],
    createdAt: row.created_at,
    evidence: row.evidence ?? undefined,
  };
}

export async function saveGoal(goal: VerdexGoal, ownerNullifier: string): Promise<boolean> {
  const db = getSupabaseClient();
  if (!db) return false;

  const { error } = await db.from("verdex_goals").insert({
    id: goal.id,
    owner_nullifier: ownerNullifier,
    title: goal.title,
    description: goal.description ?? null,
    deadline: goal.deadline,
    stake_wld: goal.stakeWld,
    yes_pool: goal.yesPool,
    no_pool: goal.noPool,
    status: goal.status,
  });

  if (error) { console.error("[verdex/db] saveGoal:", error.message); return false; }
  return true;
}

export async function getGoalsByOwner(nullifier: string): Promise<VerdexGoal[] | null> {
  const db = getSupabaseClient();
  if (!db) return null;

  const { data, error } = await db
    .from("verdex_goals")
    .select("*")
    .eq("owner_nullifier", nullifier)
    .order("created_at", { ascending: false });

  if (error) { console.error("[verdex/db] getGoalsByOwner:", error.message); return null; }
  return (data as GoalRow[]).map(rowToGoal);
}

// ── Clashes ───────────────────────────────────────────────────────────────────

type ClashRow = {
  id: string;
  market_id: string;
  market_title: string;
  creator_nullifier: string;
  creator_username: string | null;
  creator_position: string;
  stake_wld: number;
  creator_tx_ref: string;
  challenger_nullifier: string | null;
  challenger_username: string | null;
  challenger_tx_ref: string | null;
  status: string;
  winner_nullifier: string | null;
  payout_wld: number | null;
  created_at: string;
  expires_at: string;
};

function rowToClash(row: ClashRow): VerdexClash {
  const creatorPos = row.creator_position as "yes" | "no";
  return {
    id: row.id,
    marketId: row.market_id,
    marketTitle: row.market_title,
    creatorNullifier: row.creator_nullifier,
    creatorUsername: row.creator_username ?? undefined,
    creatorPosition: creatorPos,
    challengerPosition: creatorPos === "yes" ? "no" : "yes",
    stakeWld: Number(row.stake_wld),
    creatorTxRef: row.creator_tx_ref,
    challengerNullifier: row.challenger_nullifier ?? undefined,
    challengerUsername: row.challenger_username ?? undefined,
    challengerTxRef: row.challenger_tx_ref ?? undefined,
    status: row.status as VerdexClash["status"],
    winnerNullifier: row.winner_nullifier ?? undefined,
    payoutWld: row.payout_wld != null ? Number(row.payout_wld) : undefined,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export async function createClash(clash: VerdexClash): Promise<boolean> {
  const db = getSupabaseClient();
  if (!db) return false;

  const { error } = await db.from("verdex_clashes").insert({
    id: clash.id,
    market_id: clash.marketId,
    market_title: clash.marketTitle,
    creator_nullifier: clash.creatorNullifier,
    creator_username: clash.creatorUsername ?? null,
    creator_position: clash.creatorPosition,
    stake_wld: clash.stakeWld,
    creator_tx_ref: clash.creatorTxRef,
    status: "pending",
    expires_at: clash.expiresAt,
  });

  if (error) { console.error("[verdex/db] createClash:", error.message); return false; }
  return true;
}

export async function acceptClash(clashId: string, challengerNullifier: string, challengerUsername: string | undefined, txRef: string): Promise<{ ok: boolean; error?: string }> {
  const db = getSupabaseClient();
  if (!db) return { ok: false, error: "Database not configured." };

  const { data: clash, error: fetchErr } = await db
    .from("verdex_clashes")
    .select("*")
    .eq("id", clashId)
    .single();

  if (fetchErr || !clash) return { ok: false, error: "Clash not found." };
  if (clash.status !== "pending") return { ok: false, error: "Clash is no longer open." };
  if (new Date(clash.expires_at) < new Date()) return { ok: false, error: "Clash has expired." };
  if (clash.creator_nullifier === challengerNullifier) return { ok: false, error: "You cannot accept your own clash." };

  const { error: updateErr } = await db.from("verdex_clashes").update({
    challenger_nullifier: challengerNullifier,
    challenger_username: challengerUsername ?? null,
    challenger_tx_ref: txRef,
    status: "active",
  }).eq("id", clashId);

  if (updateErr) { console.error("[verdex/db] acceptClash:", updateErr.message); return { ok: false, error: "Failed to accept clash." }; }
  return { ok: true };
}

export async function getClash(id: string): Promise<VerdexClash | null> {
  const db = getSupabaseClient();
  if (!db) return null;

  const { data, error } = await db.from("verdex_clashes").select("*").eq("id", id).single();
  if (error || !data) return null;
  return rowToClash(data as ClashRow);
}

export async function getClashesByNullifier(nullifier: string): Promise<VerdexClash[] | null> {
  const db = getSupabaseClient();
  if (!db) return null;

  const { data, error } = await db
    .from("verdex_clashes")
    .select("*")
    .or(`creator_nullifier.eq.${nullifier},challenger_nullifier.eq.${nullifier}`)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) { console.error("[verdex/db] getClashesByNullifier:", error.message); return null; }
  return (data as ClashRow[]).map(rowToClash);
}

// ── Market resolution ─────────────────────────────────────────────────────────

type BetForPayout = {
  id: string;
  world_nullifier: string;
  username: string | null;
  position: string;
  amount_wld: number;
};

export async function resolveMarket(marketId: string, outcome: "yes" | "no"): Promise<{ ok: boolean; payouts: number; queued?: number; error?: string }> {
  const db = getSupabaseClient();
  if (!db) return { ok: false, payouts: 0, error: "Database not configured." };

  // Fetch market
  const { data: market, error: mErr } = await db
    .from("verdex_markets")
    .select("id, status")
    .eq("id", marketId)
    .single();

  if (mErr || !market) return { ok: false, payouts: 0, error: "Market not found." };
  if (market.status === "resolved") return { ok: false, payouts: 0, error: "Market already resolved." };

  // Fetch all confirmed bets on this market
  const { data: bets, error: bErr } = await db
    .from("verdex_bets")
    .select("id, world_nullifier, username, position, amount_wld")
    .eq("market_id", marketId)
    .eq("confirmed", true)
    .eq("paid_out", false);

  if (bErr) return { ok: false, payouts: 0, error: "Failed to fetch bets." };

  // Flat payout: every winner gets exactly FLAT_PAYOUT_MULTIPLIER x their own
  // stake — no longer a share of the losing pool. Losers get nothing (their
  // stake is already sitting in the treasury from bet placement, so it just
  // stays). Must match calcPotentialPayout in lib/verdex/utils.ts. Treasury
  // safety for this model lives in checkBetCapacity, enforced at bet time.
  const winners = (bets as BetForPayout[]).filter((b) => b.position === outcome);
  let payoutCount = 0;
  const payoutQueue: PayoutQueueEntry[] = [];

  for (const winner of winners) {
    const stake = Number(winner.amount_wld);
    const payout = Math.round(stake * FLAT_PAYOUT_MULTIPLIER * 10000) / 10000;

    await db.from("verdex_bets").update({ payout_wld: payout, paid_out: true, settled: true }).eq("id", winner.id);

    payoutQueue.push({
      source: "market",
      sourceId: winner.id,
      marketId,
      worldNullifier: winner.world_nullifier,
      username: winner.username,
      amountWld: payout,
    });

    // Update player stats
    const { data: stats } = await db.from("verdex_player_stats").select("total_won, win_streak, best_streak").eq("world_nullifier", winner.world_nullifier).single();
    const newStreak = (stats?.win_streak ?? 0) + 1;
    await db.from("verdex_player_stats").upsert({
      world_nullifier: winner.world_nullifier,
      username: winner.username ?? null,
      total_won: Number(stats?.total_won ?? 0) + payout,
      win_streak: newStreak,
      best_streak: Math.max(stats?.best_streak ?? 0, newStreak),
      updated_at: new Date().toISOString(),
    }, { onConflict: "world_nullifier" });

    payoutCount++;
  }

  // Mark losers' streaks broken
  const losers = (bets as BetForPayout[]).filter((b) => b.position !== outcome);
  for (const loser of losers) {
    await db.from("verdex_bets").update({ payout_wld: 0, paid_out: true, settled: true }).eq("id", loser.id);
    await db.from("verdex_player_stats").update({ win_streak: 0 }).eq("world_nullifier", loser.world_nullifier);
  }

  // Mark market resolved
  await db.from("verdex_markets").update({ status: "resolved", outcome }).eq("id", marketId);

  // Resolve related clashes
  const { data: clashes } = await db.from("verdex_clashes").select("id, creator_nullifier, challenger_nullifier, creator_position, stake_wld").eq("market_id", marketId).eq("status", "active");
  if (clashes) {
    for (const clash of clashes as Array<{ id: string; creator_nullifier: string; challenger_nullifier: string | null; creator_position: string; stake_wld: number }>) {
      const creatorWon = clash.creator_position === outcome;
      const winnerNullifier = creatorWon ? clash.creator_nullifier : (clash.challenger_nullifier ?? clash.creator_nullifier);
      const stake = Number(clash.stake_wld);
      const payout = Math.round(stake * 2 * 0.9 * 10000) / 10000; // 10% rake
      await db.from("verdex_clashes").update({ status: "resolved", winner_nullifier: winnerNullifier, payout_wld: payout }).eq("id", clash.id);

      payoutQueue.push({
        source: "clash",
        sourceId: clash.id,
        marketId,
        worldNullifier: winnerNullifier,
        amountWld: payout,
      });
    }
  }

  // Queue real WLD treasury payouts for every winner (idempotent per bet/clash)
  const queued = await queuePayouts(payoutQueue);

  return { ok: true, payouts: payoutCount, queued };
}

// ── Void market: cancel + refund every stake ──────────────────────────────────
// For postponed matches or permanently unresolvable markets. Every confirmed
// bet (and active clash stake) is refunded in full through the treasury rail.

export async function voidMarket(marketId: string, reason: string): Promise<{ ok: boolean; refunds: number; error?: string }> {
  const db = getSupabaseClient();
  if (!db) return { ok: false, refunds: 0, error: "Database not configured." };

  const { data: market, error: mErr } = await db
    .from("verdex_markets")
    .select("id, status, description")
    .eq("id", marketId)
    .single();

  if (mErr || !market) return { ok: false, refunds: 0, error: "Market not found." };
  if (market.status === "resolved") return { ok: false, refunds: 0, error: "Market already resolved — cannot void." };
  if (market.status === "cancelled") return { ok: false, refunds: 0, error: "Market already voided." };

  const { data: bets, error: bErr } = await db
    .from("verdex_bets")
    .select("id, world_nullifier, username, amount_wld")
    .eq("market_id", marketId)
    .eq("confirmed", true)
    .eq("paid_out", false);
  if (bErr) return { ok: false, refunds: 0, error: "Failed to fetch bets." };

  const refunds: PayoutQueueEntry[] = [];
  for (const bet of (bets ?? []) as Array<{ id: string; world_nullifier: string; username: string | null; amount_wld: number }>) {
    // payout == stake marks this bet as refunded, not won or lost
    await db.from("verdex_bets").update({ payout_wld: bet.amount_wld, paid_out: true, settled: true }).eq("id", bet.id);
    refunds.push({
      source: "market",
      sourceId: bet.id,
      marketId,
      worldNullifier: bet.world_nullifier,
      username: bet.username,
      amountWld: Number(bet.amount_wld),
    });
  }

  // Refund both sides of any clash riding on this market
  const { data: clashes } = await db
    .from("verdex_clashes")
    .select("id, creator_nullifier, challenger_nullifier, stake_wld")
    .eq("market_id", marketId)
    .in("status", ["pending", "active"]);
  for (const clash of (clashes ?? []) as Array<{ id: string; creator_nullifier: string; challenger_nullifier: string | null; stake_wld: number }>) {
    await db.from("verdex_clashes").update({ status: "expired" }).eq("id", clash.id);
    refunds.push({ source: "clash", sourceId: `${clash.id}:refund-creator`, marketId, worldNullifier: clash.creator_nullifier, amountWld: Number(clash.stake_wld) });
    if (clash.challenger_nullifier) {
      refunds.push({ source: "clash", sourceId: `${clash.id}:refund-challenger`, marketId, worldNullifier: clash.challenger_nullifier, amountWld: Number(clash.stake_wld) });
    }
  }

  await db.from("verdex_markets").update({
    status: "cancelled",
    description: `${market.description ?? ""} — VOIDED: ${reason.slice(0, 200)}. All stakes refunded in full.`.trim(),
  }).eq("id", marketId);

  const queued = await queuePayouts(refunds);
  return { ok: true, refunds: queued };
}

// ── Bet wallets for notifications ─────────────────────────────────────────────

export async function getBetNullifiers(marketId: string): Promise<string[]> {
  const db = getSupabaseClient();
  if (!db) return [];

  const { data } = await db
    .from("verdex_bets")
    .select("world_nullifier")
    .eq("market_id", marketId)
    .eq("confirmed", true);

  if (!data) return [];
  return [...new Set((data as Array<{ world_nullifier: string }>).map((r) => r.world_nullifier))];
}
