import { loadJsonFromStorage, saveJsonToStorage } from "@/lib/storage";
import type { VerdexBet, VerdexCombo, VerdexGoal, VerdexMarket, VerdexPlayerStats } from "@/types/verdex";

const STORAGE_BETS   = "verdex_bets_v1";
const STORAGE_GOALS  = "verdex_goals_v1";
const STORAGE_COMBOS = "verdex_combos_v1";
const STORAGE_LOCAL_POOLS = "verdex_local_pools_v1";

// Per-bet ceiling under the flat 2x payout model — keeps any single bet's
// worst-case treasury impact small; the real safety net is the aggregate
// exposure cap in lib/verdex/db.ts, this is just a sane sanity ceiling.
export const MAX_BET_WLD = 5;

// ── Storage ──────────────────────────────────────────────────────────────────

export function loadVerdexBets(): VerdexBet[] {
  return loadJsonFromStorage<VerdexBet[]>(STORAGE_BETS, []);
}

export function saveVerdexBets(bets: VerdexBet[]) {
  saveJsonToStorage(STORAGE_BETS, bets.slice(0, 200));
}

export function loadVerdexGoals(): VerdexGoal[] {
  return loadJsonFromStorage<VerdexGoal[]>(STORAGE_GOALS, []);
}

export function saveVerdexGoals(goals: VerdexGoal[]) {
  saveJsonToStorage(STORAGE_GOALS, goals);
}

// Local pool overrides so user bets persist visually after refreshing
type LocalPools = Record<string, { yes: number; no: number }>;
export function loadLocalPools(): LocalPools {
  return loadJsonFromStorage<LocalPools>(STORAGE_LOCAL_POOLS, {});
}
export function saveLocalPools(pools: LocalPools) {
  saveJsonToStorage(STORAGE_LOCAL_POOLS, pools);
}

// ── Market helpers ────────────────────────────────────────────────────────────

export function applyLocalPools(markets: VerdexMarket[]): VerdexMarket[] {
  const pools = loadLocalPools();
  return markets.map((m) => {
    const override = pools[m.id];
    if (!override) return m;
    return { ...m, yesPool: override.yes, noPool: override.no };
  });
}

export function addBetToLocalPools(marketId: string, position: "yes" | "no", amount: number, baseMarket: VerdexMarket) {
  const pools = loadLocalPools();
  const current = pools[marketId] ?? { yes: baseMarket.yesPool, no: baseMarket.noPool };
  pools[marketId] = {
    yes: position === "yes" ? current.yes + amount : current.yes,
    no: position === "no" ? current.no + amount : current.no,
  };
  saveLocalPools(pools);
}

// ── Math ──────────────────────────────────────────────────────────────────────

export function calcYesPct(yesPool: number, noPool: number): number {
  const total = yesPool + noPool;
  if (total === 0) return 50;
  return Math.round((yesPool / total) * 100);
}

// Flat payout model: a correct call always pays exactly 2x the stake; a wrong
// call forfeits the stake to the treasury (it's already there — every stake
// is paid to the treasury address at bet time). Pool sizes no longer affect
// the payout — they're kept as params so every call site (bet sheet, market
// card, spotlight, combo odds) needs no signature changes. Safety against
// this now depends entirely on the exposure cap enforced in
// lib/verdex/db.ts (checkBetCapacity / placeBet) — see FLAT_PAYOUT_MULTIPLIER.
export const FLAT_PAYOUT_MULTIPLIER = 2;

export function calcPotentialPayout(
  betAmount: number,
  _position: "yes" | "no",
  _yesPool: number,
  _noPool: number,
): number {
  return Math.round(betAmount * FLAT_PAYOUT_MULTIPLIER * 100) / 100;
}

export function calcOdds(_position: "yes" | "no", _yesPool: number, _noPool: number): string {
  return `${FLAT_PAYOUT_MULTIPLIER.toFixed(2)}×`;
}

// ── Countdown ────────────────────────────────────────────────────────────────

export function formatCountdown(closesAt: string): { label: string; urgent: boolean; expired: boolean } {
  const diff = new Date(closesAt).getTime() - Date.now();
  if (diff <= 0) return { label: "Closed", urgent: false, expired: true };

  const totalSecs = Math.floor(diff / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  if (days > 0) return { label: `${days}d ${hours}h`, urgent: false, expired: false };
  if (hours > 0) return { label: `${hours}h ${mins}m`, urgent: hours < 2, expired: false };
  if (mins > 0) return { label: `${mins}m ${secs}s`, urgent: true, expired: false };
  return { label: `${secs}s`, urgent: true, expired: false };
}

// ── Stats ────────────────────────────────────────────────────────────────────

/**
 * Definitive won/lost/refunded/open classification for a settled bet.
 *
 * Payout amount alone is ambiguous: a genuine win against zero opposing pool
 * pays back exactly the stake (payout === amountWld) — the same number a
 * voided/refunded market produces. Prefer the server-joined market status +
 * resolved outcome (ground truth); fall back to the payout heuristic only for
 * bets synced before that data was available.
 */
export function getBetResult(bet: VerdexBet): "won" | "lost" | "refunded" | "open" {
  if (!bet.settled) return "open";
  if (bet.marketStatus === "cancelled") return "refunded";
  if (bet.marketStatus === "resolved" && bet.marketOutcome) {
    return bet.position === bet.marketOutcome ? "won" : "lost";
  }
  const refunded = bet.payout != null && Math.abs(bet.payout - bet.amountWld) < 1e-9;
  if (refunded) return "refunded";
  return (bet.payout ?? 0) > bet.amountWld ? "won" : "lost";
}

export function calcPlayerStats(bets: VerdexBet[]): VerdexPlayerStats {
  const confirmed = bets.filter((b) => b.confirmed);
  const settled = confirmed.filter((b) => b.settled);
  const won = settled.filter((b) => getBetResult(b) === "won");

  const totalWon = won.reduce((s, b) => s + (b.payout ?? 0), 0);
  const totalWagered = confirmed.reduce((s, b) => s + b.amountWld, 0);
  const winRate = settled.length > 0 ? Math.round((won.length / settled.length) * 100) : 0;

  // Simple streak: count consecutive wins from latest bet backwards
  let streak = 0;
  for (let i = settled.length - 1; i >= 0; i--) {
    if (getBetResult(settled[i]) === "won") streak++;
    else break;
  }

  return {
    totalBets: confirmed.length,
    totalWagered: Math.round(totalWagered * 100) / 100,
    totalWon: Math.round(totalWon * 100) / 100,
    winRate,
    currentStreak: streak,
    bestStreak: streak,
  };
}

// ── Combo storage ────────────────────────────────────────────────────────────

export function loadVerdexCombos(): VerdexCombo[] {
  return loadJsonFromStorage<VerdexCombo[]>(STORAGE_COMBOS, []);
}
export function saveVerdexCombos(combos: VerdexCombo[]) {
  saveJsonToStorage(STORAGE_COMBOS, combos.slice(0, 100));
}

// ── Category display ──────────────────────────────────────────────────────────

export const categoryMeta: Record<string, { label: string; emoji: string; color: string }> = {
  all:     { label: "All",     emoji: "⚡", color: "#6366f1" },
  crypto:  { label: "Crypto",  emoji: "🪙", color: "#f59e0b" },
  sports:  { label: "Sports",  emoji: "⚽", color: "#3b82f6" },
  world:   { label: "World",   emoji: "🌍", color: "#10b981" },
  culture: { label: "Culture", emoji: "🎭", color: "#ec4899" },
  micro:   { label: "⚡Micro", emoji: "⚡", color: "#8b5cf6" },
};

export function formatPoolSize(wld: number): string {
  if (wld >= 1000) return `${(wld / 1000).toFixed(1)}K WLD`;
  return `${wld} WLD`;
}
