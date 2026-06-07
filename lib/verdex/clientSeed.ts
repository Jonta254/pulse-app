/**
 * Minimal client-side seed — shown while /api/verdex/markets loads.
 * Intentionally small (3 markets) so it doesn't bloat the browser bundle.
 * The full 601-line data.ts stays server-side only (used by API routes).
 */
import type { VerdexMarket, VerdexLeaderEntry } from "@/types/verdex";

function hoursFromNow(h: number) {
  return new Date(Date.now() + h * 3600000).toISOString();
}
function daysFromNow(d: number) {
  return new Date(Date.now() + d * 86400000).toISOString();
}

export const clientSeedMarkets: VerdexMarket[] = [
  {
    id: "verdex-m1",
    title: "Will Bitcoin close above $110,000 this week?",
    description: "Based on Coinbase closing price at end of Sunday UTC.",
    category: "crypto",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 3840, noPool: 2160, status: "open",
    featured: true, aiGenerated: false, totalBettors: 284,
  },
  {
    id: "verdex-hot-b1",
    title: "Will the NBA Finals go to Game 7?",
    description: "2025-26 NBA Finals. Resolves when series ends.",
    category: "sports",
    closesAt: daysFromNow(3),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 5100, noPool: 3800, status: "open",
    featured: false, aiGenerated: false, totalBettors: 1024,
  },
  {
    id: "verdex-hot-f2",
    title: "Will Kylian Mbappé score in Real Madrid's next match?",
    description: "Any goal in the next official Real Madrid match (all competitions).",
    category: "sports",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 6200, noPool: 2900, status: "open",
    featured: false, aiGenerated: false, totalBettors: 891,
  },
];

export const clientSeedLeaderboard: VerdexLeaderEntry[] = [
  { rank: 1, username: "@oracle_signal", initial: "O", winRate: 94, totalBets: 186, totalWonWld: 2840, streak: 22, specialty: "Crypto", badge: "🏆" },
  { rank: 2, username: "@signal_seven",  initial: "S", winRate: 87, totalBets: 241, totalWonWld: 1970, streak: 14, specialty: "World",  badge: "🥈" },
  { rank: 3, username: "@forecast_mind", initial: "F", winRate: 83, totalBets: 128, totalWonWld: 1540, streak: 9,  specialty: "Sports", badge: "🥉" },
];
