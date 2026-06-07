import { loadJsonFromStorage, saveJsonToStorage } from "@/lib/storage";
import type { VerdexBet, VerdexGoal, VerdexMarket, VerdexPlayerStats } from "@/types/verdex";

const STORAGE_BETS = "verdex_bets_v1";
const STORAGE_GOALS = "verdex_goals_v1";
const STORAGE_LOCAL_POOLS = "verdex_local_pools_v1";

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

export function calcPotentialPayout(
  betAmount: number,
  position: "yes" | "no",
  yesPool: number,
  noPool: number,
): number {
  const winPool = position === "yes" ? yesPool : noPool;
  const losePool = position === "yes" ? noPool : yesPool;
  const platformFee = 0.003; // 0.3%
  const net = losePool * (1 - platformFee);
  const payout = betAmount + (betAmount / (winPool + betAmount)) * net;
  return Math.round(payout * 100) / 100;
}

export function calcOdds(position: "yes" | "no", yesPool: number, noPool: number): string {
  const total = yesPool + noPool;
  if (total === 0) return "2.00×";
  const pct = position === "yes" ? yesPool / total : noPool / total;
  if (pct === 0) return "∞";
  return `${(1 / pct).toFixed(2)}×`;
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

export function calcPlayerStats(bets: VerdexBet[]): VerdexPlayerStats {
  const confirmed = bets.filter((b) => b.confirmed);
  const settled = confirmed.filter((b) => b.settled);
  const won = settled.filter((b) => (b.payout ?? 0) > b.amountWld);

  const totalWon = won.reduce((s, b) => s + (b.payout ?? 0), 0);
  const totalWagered = confirmed.reduce((s, b) => s + b.amountWld, 0);
  const winRate = settled.length > 0 ? Math.round((won.length / settled.length) * 100) : 0;

  // Simple streak: count consecutive wins from latest bet backwards
  let streak = 0;
  for (let i = settled.length - 1; i >= 0; i--) {
    if ((settled[i].payout ?? 0) > settled[i].amountWld) streak++;
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
