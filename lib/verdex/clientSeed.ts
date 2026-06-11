/**
 * Client-side seed markets — shown instantly while /api/verdex/markets loads.
 * Kept lean for bundle size. Full server-side seed is in data.ts (API only).
 */
import type { VerdexMarket, VerdexLeaderEntry } from "@/types/verdex";

function h(n: number) { return new Date(Date.now() + n * 3_600_000).toISOString(); }
function d(n: number) { return new Date(Date.now() + n * 86_400_000).toISOString(); }
function m(n: number) { return new Date(Date.now() + n * 60_000).toISOString(); }

export const clientSeedMarkets: VerdexMarket[] = [
  // ── ⚡ FLASH (micro) ──────────────────────────────────────────────────────
  {
    id: "verdex-flash-1",
    title: "Will BTC move >1% in the next 30 minutes?",
    description: "Binance BTCUSDT spot. Price change measured from market open to close.",
    category: "micro", closesAt: m(29), resolvesAt: m(30),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: true, aiGenerated: false, totalBettors: 0,
  },
  {
    id: "verdex-flash-2",
    title: "Will ETH outperform BTC in the next hour?",
    description: "Binance — ETH/USDT % gain vs BTC/USDT % gain over next 60 minutes.",
    category: "micro", closesAt: h(1), resolvesAt: h(1),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },
  {
    id: "verdex-flash-3",
    title: "Will WLD be up vs 1 hour ago at the top of the hour?",
    description: "Binance WLD/USDT. Compares current price to price exactly 1h prior.",
    category: "micro", closesAt: m(55), resolvesAt: h(1),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },

  // ── 🪙 CRYPTO ─────────────────────────────────────────────────────────────
  {
    id: "verdex-btc-120k",
    title: "Will Bitcoin close above $120,000 this week?",
    description: "Coinbase BTC/USD closing price at end of Sunday 23:59 UTC.",
    category: "crypto", closesAt: d(3), resolvesAt: d(4),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },
  {
    id: "verdex-eth-flip",
    title: "Will Ethereum flip Bitcoin in market cap by end of 2026?",
    description: "CoinMarketCap total market cap. ETH market cap > BTC market cap on Dec 31 2026.",
    category: "crypto", closesAt: d(60), resolvesAt: d(61),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },
  {
    id: "verdex-wld-5",
    title: "Will WLD reach $5 before July 2026?",
    description: "Binance WLD/USDT — any 1-minute candle close at or above $5.00.",
    category: "crypto", closesAt: d(22), resolvesAt: d(23),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },

  // ── ⚽ SPORTS ─────────────────────────────────────────────────────────────
  {
    id: "verdex-nba-g7",
    title: "Will the NBA Finals go to Game 7?",
    description: "2025-26 NBA Finals. Resolves when the series ends.",
    category: "sports", closesAt: d(4), resolvesAt: d(5),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },
  {
    id: "verdex-mbappe-goal",
    title: "Will Mbappé score in Real Madrid's next match?",
    description: "Any goal in the next official Real Madrid match (all competitions). Verified by ESPN.",
    category: "sports", closesAt: d(2), resolvesAt: d(3),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },

  // ── 🌍 WORLD ──────────────────────────────────────────────────────────────
  {
    id: "verdex-fed-cut",
    title: "Will the Fed cut rates in the next FOMC meeting?",
    description: "Federal Reserve FOMC decision. Resolves based on official rate announcement.",
    category: "world", closesAt: d(18), resolvesAt: d(19),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },

  // ── 🎭 CULTURE ────────────────────────────────────────────────────────────
  {
    id: "verdex-culture-1",
    title: "Will GTA VI gross $1B in its opening weekend?",
    description: "Official sales figures from Rockstar/Take-Two. All platforms combined.",
    category: "culture", closesAt: d(45), resolvesAt: d(46),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },
];

export const clientSeedLeaderboard: VerdexLeaderEntry[] = [
  { rank: 1, username: "@oracle_signal", initial: "O", winRate: 94, totalBets: 186, totalWonWld: 2840, streak: 22, specialty: "Crypto",  badge: "🏆" },
  { rank: 2, username: "@signal_seven",  initial: "S", winRate: 87, totalBets: 241, totalWonWld: 1970, streak: 14, specialty: "World",   badge: "🥈" },
  { rank: 3, username: "@forecast_mind", initial: "F", winRate: 83, totalBets: 128, totalWonWld: 1540, streak: 9,  specialty: "Sports",  badge: "🥉" },
  { rank: 4, username: "@verdex_reader", initial: "V", winRate: 77, totalBets:  94, totalWonWld:  940, streak: 3,  specialty: "Crypto",  badge: ""   },
  { rank: 5, username: "@world_predict", initial: "W", winRate: 74, totalBets:  81, totalWonWld:  670, streak: 2,  specialty: "Culture", badge: ""   },
];
