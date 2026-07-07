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
  {
    id: "verdex-flash-4",
    title: "Will SOL outperform ETH in the next 2 hours?",
    description: "Binance SOL/USDT % gain vs ETH/USDT % gain from now to close.",
    category: "micro", closesAt: h(2), resolvesAt: h(2),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },
  {
    id: "verdex-flash-5",
    title: "Will ETH gas stay below 20 gwei for the next 45 minutes?",
    description: "Etherscan average gas tracker — every minute must be below 20 gwei.",
    category: "micro", closesAt: m(44), resolvesAt: m(45),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },
  {
    id: "verdex-flash-6",
    title: "Will BTC dominance rise in the next 3 hours?",
    description: "CoinGecko BTC dominance % — must be higher at close than at market open.",
    category: "micro", closesAt: h(3), resolvesAt: h(3),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },
  {
    id: "verdex-flash-7",
    title: "Will XRP move more than 2% in either direction this hour?",
    description: "Binance XRP/USDT spot. Measures absolute % change from open to close.",
    category: "micro", closesAt: m(58), resolvesAt: h(1),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },
  {
    id: "verdex-flash-8",
    title: "Will DOGE hit a new 24h high in the next 4 hours?",
    description: "Binance DOGE/USDT — does any 1-minute candle set a new 24h high?",
    category: "micro", closesAt: h(4), resolvesAt: h(4),
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
    title: "Will WLD reach $5 before August 2026?",
    description: "Binance WLD/USDT — any 1-minute candle close at or above $5.00.",
    category: "crypto", closesAt: d(55), resolvesAt: d(56),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },
  {
    id: "verdex-sol-200",
    title: "Will SOL hit $200 this week?",
    description: "Binance SOL/USDT spot — any 1-minute candle close at or above $200.00.",
    category: "crypto", closesAt: d(5), resolvesAt: d(6),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },
  {
    id: "verdex-eth-4k",
    title: "Will ETH close above $4,000 this week?",
    description: "Coinbase ETH/USD weekly close (Sunday midnight UTC).",
    category: "crypto", closesAt: d(4), resolvesAt: d(5),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },
  {
    id: "verdex-btc-4t",
    title: "Will the crypto market cap hit $4 trillion this month?",
    description: "CoinGecko global market cap reaches $4,000,000,000,000 at any point.",
    category: "crypto", closesAt: d(20), resolvesAt: d(21),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },
  {
    id: "verdex-xrp-1",
    title: "Will XRP close above $1 this week?",
    description: "Binance XRP/USDT weekly close (Sunday midnight UTC).",
    category: "crypto", closesAt: d(4), resolvesAt: d(5),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },

  // ── ⚽ SPORTS ─────────────────────────────────────────────────────────────
  {
    id: "verdex-wc-final-ny",
    title: "Will the 2026 FIFA World Cup final be held in New York?",
    description: "MetLife Stadium selected as final venue by FIFA. Resolves on official FIFA announcement.",
    category: "sports", closesAt: d(8), resolvesAt: d(9),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },
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
  {
    id: "verdex-haaland-hat",
    title: "Will Haaland score a hat-trick in the next 3 days?",
    description: "Any official match. First source to confirm 3 goals by Haaland in a single game.",
    category: "sports", closesAt: d(3), resolvesAt: d(3),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },
  {
    id: "verdex-ucl-draw",
    title: "Will the UCL Final end in a draw after 90 minutes?",
    description: "2025-26 UEFA Champions League Final. Resolves at full-time whistle (90 min).",
    category: "sports", closesAt: d(5), resolvesAt: d(5),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },
  {
    id: "verdex-f1-verstappen",
    title: "Will Max Verstappen win the next F1 race?",
    description: "Next Formula 1 Grand Prix on the 2026 calendar. Per official FIA results.",
    category: "sports", closesAt: d(3), resolvesAt: d(4),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },

  // ── 🌍 WORLD ──────────────────────────────────────────────────────────────
  {
    id: "verdex-fed-cut",
    title: "Will the Fed cut rates at the next FOMC meeting?",
    description: "Federal Reserve FOMC decision. Resolves based on official rate announcement.",
    category: "world", closesAt: d(18), resolvesAt: d(19),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },
  {
    id: "verdex-wti-3pct",
    title: "Will oil prices (WTI) move more than 3% this week?",
    description: "WTI crude oil 7-day price change exceeds ±3% by Sunday close.",
    category: "world", closesAt: d(5), resolvesAt: d(6),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },
  {
    id: "verdex-quake",
    title: "Will there be a major earthquake (7.0+) this week?",
    description: "USGS reports a 7.0+ magnitude earthquake globally within next 7 days.",
    category: "world", closesAt: d(6), resolvesAt: d(7),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },
  {
    id: "verdex-btc-legal",
    title: "Will a new country adopt Bitcoin as legal tender in 2026?",
    description: "Must be a UN-recognized nation passing formal legislation.",
    category: "world", closesAt: d(180), resolvesAt: d(182),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },
  {
    id: "verdex-worldcoin-15m",
    title: "Will World App reach 15 million users by end of 2026?",
    description: "Total registered World App users per official Worldcoin announcement.",
    category: "world", closesAt: d(178), resolvesAt: d(180),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },

  // ── 🎭 CULTURE ────────────────────────────────────────────────────────────
  {
    id: "verdex-gta6-1b",
    title: "Will GTA VI gross $1B in its opening weekend?",
    description: "Official sales figures from Rockstar/Take-Two. All platforms combined.",
    category: "culture", closesAt: d(45), resolvesAt: d(46),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },
  {
    id: "verdex-gta6-2026",
    title: "Will GTA VI release in 2026?",
    description: "GTA VI officially launches on any platform in the 2026 calendar year.",
    category: "culture", closesAt: d(120), resolvesAt: d(121),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },
  {
    id: "verdex-gpt5",
    title: "Will GPT-5 be publicly released before August 2026?",
    description: "OpenAI makes GPT-5 available to the public (free or paid tier).",
    category: "culture", closesAt: d(50), resolvesAt: d(51),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  },
  {
    id: "verdex-drake-music",
    title: "Will Drake drop new music this week?",
    description: "Any new single, album, or project released on any major streaming platform.",
    category: "culture", closesAt: d(5), resolvesAt: d(6),
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
