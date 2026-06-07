import type { PulseMarket, PulseLeaderEntry } from "@/types/pulse";

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function hoursFromNow(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

function minutesFromNow(minutes: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

export const seedMarkets: PulseMarket[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // 🔥 HOT — 2 to 3 DAY MARKETS (highest engagement, daily check-ins)
  // ══════════════════════════════════════════════════════════════════════════

  // ── Football (Soccer) ──────────────────────────────────────────────────────
  {
    id: "pulse-hot-f1",
    title: "Will the 2026 FIFA World Cup final be held in New York?",
    description: "MetLife Stadium selected as final venue by FIFA. Resolves on official FIFA announcement.",
    category: "sports",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 4800, noPool: 2100, status: "open",
    featured: true, aiGenerated: false, totalBettors: 634,
  },
  {
    id: "pulse-hot-f2",
    title: "Will Kylian Mbappé score in Real Madrid's next match?",
    description: "Any goal in the next official Real Madrid match (all competitions).",
    category: "sports",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 6200, noPool: 2900, status: "open",
    featured: true, aiGenerated: false, totalBettors: 891,
  },
  {
    id: "pulse-hot-f3",
    title: "Will Argentina win their next international match?",
    description: "Full-time result only. Penalties count as a win. Next FIFA-listed Argentina fixture.",
    category: "sports",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 5500, noPool: 2200, status: "open",
    featured: false, aiGenerated: false, totalBettors: 712,
  },
  {
    id: "pulse-hot-f4",
    title: "Will the UCL Final end in a draw after 90 minutes?",
    description: "2025-26 UEFA Champions League Final. Resolves at full-time whistle (90 min).",
    category: "sports",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(2),
    outcome: null, yesPool: 1400, noPool: 5800, status: "open",
    featured: false, aiGenerated: false, totalBettors: 478,
  },
  {
    id: "pulse-hot-f5",
    title: "Will there be a VAR controversy in the World Cup final?",
    description: "Official VAR intervention (goal ruled out or penalty awarded via review) in the 2026 WC final.",
    category: "sports",
    closesAt: daysFromNow(3),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 3900, noPool: 2800, status: "open",
    featured: false, aiGenerated: true, totalBettors: 523,
  },
  {
    id: "pulse-hot-f6",
    title: "Will Erling Haaland score a hat-trick in the next 3 days?",
    description: "Any official match. First source to confirm 3 goals by Haaland in a single game.",
    category: "sports",
    closesAt: daysFromNow(3),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 1200, noPool: 4800, status: "open",
    featured: false, aiGenerated: false, totalBettors: 387,
  },
  {
    id: "pulse-hot-f7",
    title: "Will PSG reach the next round of their current cup run?",
    description: "Paris Saint-Germain advance from their next knockout tie (all competitions).",
    category: "sports",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 3400, noPool: 2100, status: "open",
    featured: false, aiGenerated: false, totalBettors: 341,
  },

  // ── NBA / Basketball ───────────────────────────────────────────────────────
  {
    id: "pulse-hot-b1",
    title: "Will the NBA Finals go to Game 7?",
    description: "2025-26 NBA Finals. Resolves when series ends.",
    category: "sports",
    closesAt: daysFromNow(3),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 5100, noPool: 3800, status: "open",
    featured: true, aiGenerated: false, totalBettors: 1024,
  },
  {
    id: "pulse-hot-b2",
    title: "Will LeBron James score 30+ points in the next NBA Finals game?",
    description: "Points per official NBA box score for the next Finals game played.",
    category: "sports",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(2),
    outcome: null, yesPool: 4200, noPool: 2900, status: "open",
    featured: false, aiGenerated: false, totalBettors: 734,
  },
  {
    id: "pulse-hot-b3",
    title: "Will Stephen Curry hit 5+ three-pointers in the next 2 days?",
    description: "Any single NBA game within the next 48 hours. Per official NBA stats.",
    category: "sports",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(2),
    outcome: null, yesPool: 5800, noPool: 2100, status: "open",
    featured: false, aiGenerated: false, totalBettors: 892,
  },
  {
    id: "pulse-hot-b4",
    title: "Will there be a buzzer-beater in the next NBA Finals game?",
    description: "Shot at or after the buzzer that changes the outcome. Per official NBA review.",
    category: "sports",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(2),
    outcome: null, yesPool: 2300, noPool: 4100, status: "open",
    featured: false, aiGenerated: true, totalBettors: 561,
  },
  {
    id: "pulse-hot-b5",
    title: "Will the NBA Finals MVP be a point guard?",
    description: "Official NBA MVP award. Resolves when series ends and award is announced.",
    category: "sports",
    closesAt: daysFromNow(3),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 3600, noPool: 2400, status: "open",
    featured: false, aiGenerated: false, totalBettors: 423,
  },
  {
    id: "pulse-hot-b6",
    title: "Will the 2026 NBA Draft #1 pick come from college?",
    description: "NBA Draft 2026 — first overall pick background. Resolves on Draft Day announcement.",
    category: "sports",
    closesAt: daysFromNow(3),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 4100, noPool: 1800, status: "open",
    featured: false, aiGenerated: false, totalBettors: 312,
  },

  // ── Boxing & MMA ───────────────────────────────────────────────────────────
  {
    id: "pulse-hot-x1",
    title: "Will Canelo Álvarez's next fight end by KO?",
    description: "Any Canelo fight within next 30 days. Knockout or TKO, any round.",
    category: "sports",
    closesAt: daysFromNow(3),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 4700, noPool: 3200, status: "open",
    featured: false, aiGenerated: false, totalBettors: 567,
  },
  {
    id: "pulse-hot-x2",
    title: "Will Jon Jones fight again in 2026?",
    description: "UFC confirms Jon Jones bout for 2026 calendar year. Any official announcement.",
    category: "sports",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 2900, noPool: 3600, status: "open",
    featured: false, aiGenerated: true, totalBettors: 298,
  },

  // ── Tennis ─────────────────────────────────────────────────────────────────
  {
    id: "pulse-hot-t1",
    title: "Will Carlos Alcaraz win his next Grand Slam match in straight sets?",
    description: "Next Wimbledon or Grand Slam match. Straight sets = 3-0 in best of 5.",
    category: "sports",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(2),
    outcome: null, yesPool: 4900, noPool: 2100, status: "open",
    featured: false, aiGenerated: false, totalBettors: 445,
  },
  {
    id: "pulse-hot-t2",
    title: "Will Jannik Sinner hold the world #1 ranking by end of this week?",
    description: "Per official ATP live rankings on Sunday at 00:00 UTC.",
    category: "sports",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(2),
    outcome: null, yesPool: 5600, noPool: 1400, status: "open",
    featured: false, aiGenerated: false, totalBettors: 334,
  },

  // ── Formula 1 ──────────────────────────────────────────────────────────────
  {
    id: "pulse-hot-f1r1",
    title: "Will Max Verstappen win the next F1 race?",
    description: "Next Formula 1 Grand Prix on the 2026 calendar. Per official FIA results.",
    category: "sports",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 3800, noPool: 3200, status: "open",
    featured: false, aiGenerated: false, totalBettors: 589,
  },
  {
    id: "pulse-hot-f1r2",
    title: "Will there be a Safety Car in the next F1 race?",
    description: "Official or Virtual Safety Car deployed at any point in the next Grand Prix.",
    category: "sports",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 6100, noPool: 1200, status: "open",
    featured: false, aiGenerated: true, totalBettors: 712,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 🔥 HOT CULTURE & VIRAL (2-3 days, very shareable)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "pulse-hot-c1",
    title: "Will Drake drop new music this week?",
    description: "Any new single, album, or project released on any major streaming platform.",
    category: "culture",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 2800, noPool: 3900, status: "open",
    featured: false, aiGenerated: false, totalBettors: 671,
  },
  {
    id: "pulse-hot-c2",
    title: "Will a celebrity announce a major breakup this week?",
    description: "Any A-list celebrity breakup confirmed via official statement or credible media within 7 days.",
    category: "culture",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 4100, noPool: 2700, status: "open",
    featured: false, aiGenerated: true, totalBettors: 834,
  },
  {
    id: "pulse-hot-c3",
    title: "Will Kendrick Lamar perform at a surprise event this week?",
    description: "Unannounced/surprise performance confirmed by credible source within 7 days.",
    category: "culture",
    closesAt: daysFromNow(3),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 1900, noPool: 5200, status: "open",
    featured: false, aiGenerated: false, totalBettors: 445,
  },
  {
    id: "pulse-hot-c4",
    title: "Will GTA VI get a new trailer this month?",
    description: "Rockstar Games releases new official GTA VI trailer before end of month.",
    category: "culture",
    closesAt: daysFromNow(3),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 3700, noPool: 4800, status: "open",
    featured: false, aiGenerated: false, totalBettors: 1102,
  },
  {
    id: "pulse-hot-c5",
    title: "Will a new meme coin 10x in the next 48 hours?",
    description: "Any coin with meme/culture category on CoinGecko gains 10x from its current price.",
    category: "culture",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(2),
    outcome: null, yesPool: 2200, noPool: 5100, status: "open",
    featured: false, aiGenerated: true, totalBettors: 892,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ⚡ CRYPTO (existing + new short-term)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "pulse-m1",
    title: "Will Bitcoin close above $110,000 this week?",
    description: "Based on Coinbase closing price at end of Sunday UTC.",
    category: "crypto",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 3840, noPool: 2160, status: "open",
    featured: false, aiGenerated: false, totalBettors: 284,
  },
  {
    id: "pulse-m2",
    title: "Will ETH/BTC ratio cross 0.04 before July 2026?",
    description: "Measured on Binance spot at any point before July 1 UTC.",
    category: "crypto",
    closesAt: daysFromNow(22),
    resolvesAt: daysFromNow(23),
    outcome: null, yesPool: 1240, noPool: 960, status: "open",
    aiGenerated: true, totalBettors: 118,
  },
  {
    id: "pulse-m3",
    title: "Will WLD token reach $5 before August 2026?",
    description: "Any exchange price, sustained for 10+ minutes.",
    category: "crypto",
    closesAt: daysFromNow(55),
    resolvesAt: daysFromNow(56),
    outcome: null, yesPool: 2100, noPool: 3400, status: "open",
    totalBettors: 321,
  },
  {
    id: "pulse-hot-cr1",
    title: "Will BTC break a new all-time high in the next 48 hours?",
    description: "BTC/USD on Binance exceeds $111,900 (current ATH) at any point in next 48 hours.",
    category: "crypto",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(2),
    outcome: null, yesPool: 3200, noPool: 5800, status: "open",
    featured: true, aiGenerated: false, totalBettors: 1241,
  },
  {
    id: "pulse-hot-cr2",
    title: "Will ETH close above $4,000 by end of this week?",
    description: "Coinbase ETH/USD weekly close (Sunday midnight UTC).",
    category: "crypto",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 4100, noPool: 2800, status: "open",
    featured: false, aiGenerated: false, totalBettors: 678,
  },
  {
    id: "pulse-hot-cr3",
    title: "Will Solana outperform Bitcoin this week (% gains)?",
    description: "SOL 7-day % gain > BTC 7-day % gain per CoinGecko (this Sunday UTC).",
    category: "crypto",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 2900, noPool: 3400, status: "open",
    featured: false, aiGenerated: true, totalBettors: 445,
  },
  {
    id: "pulse-hot-cr4",
    title: "Will the crypto total market cap hit $4T this month?",
    description: "CoinGecko global market cap reaches $4,000,000,000,000 at any point.",
    category: "crypto",
    closesAt: daysFromNow(3),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 3600, noPool: 4200, status: "open",
    featured: false, aiGenerated: true, totalBettors: 523,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 🌍 WORLD EVENTS (2-3 days)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "pulse-m6",
    title: "Will the US Federal Reserve cut rates in July 2026?",
    description: "Any rate cut announced at the July FOMC meeting.",
    category: "world",
    closesAt: daysFromNow(25),
    resolvesAt: daysFromNow(26),
    outcome: null, yesPool: 4400, noPool: 2600, status: "open",
    aiGenerated: true, totalBettors: 398,
  },
  {
    id: "pulse-m11",
    title: "Will World App reach 15 million users by end of 2026?",
    description: "Total registered World App users per official Worldcoin announcement.",
    category: "world",
    closesAt: daysFromNow(200),
    resolvesAt: daysFromNow(202),
    outcome: null, yesPool: 6800, noPool: 2200, status: "open",
    aiGenerated: false, totalBettors: 782,
  },
  {
    id: "pulse-hot-w1",
    title: "Will there be a major earthquake (7.0+) somewhere in the world this week?",
    description: "USGS reports a 7.0+ magnitude earthquake globally within next 7 days.",
    category: "world",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 3800, noPool: 2900, status: "open",
    featured: false, aiGenerated: true, totalBettors: 456,
  },
  {
    id: "pulse-hot-w2",
    title: "Will Elon Musk post 10+ times on X today?",
    description: "Elon Musk's @elonmusk account posts (original tweets only, no RTs) in UTC today.",
    category: "world",
    closesAt: hoursFromNow(20),
    resolvesAt: hoursFromNow(24),
    outcome: null, yesPool: 5900, noPool: 1800, status: "open",
    featured: false, aiGenerated: true, totalBettors: 1034,
  },
  {
    id: "pulse-hot-w3",
    title: "Will oil prices (WTI) move more than 3% this week?",
    description: "WTI crude oil 7-day price change exceeds ±3% by Sunday close.",
    category: "world",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 2800, noPool: 3400, status: "open",
    featured: false, aiGenerated: true, totalBettors: 312,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 🎮 GAMING & TECH (viral & shareable)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "pulse-hot-g1",
    title: "Will GPT-5 be publicly released before August 2026?",
    description: "OpenAI makes GPT-5 available to the public (free or paid tier).",
    category: "culture",
    closesAt: daysFromNow(60),
    resolvesAt: daysFromNow(61),
    outcome: null, yesPool: 4800, noPool: 2200, status: "open",
    aiGenerated: false, totalBettors: 876,
  },
  {
    id: "pulse-hot-g2",
    title: "Will GTA VI release in 2026?",
    description: "GTA VI officially launches on any platform in the 2026 calendar year.",
    category: "culture",
    closesAt: daysFromNow(3),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 5200, noPool: 3100, status: "open",
    featured: false, aiGenerated: false, totalBettors: 2341,
  },
  {
    id: "pulse-hot-g3",
    title: "Will any streamer hit 500K concurrent viewers this week?",
    description: "Twitch, YouTube, or Kick — any single stream reaches 500,000 live viewers.",
    category: "culture",
    closesAt: daysFromNow(2),
    resolvesAt: daysFromNow(3),
    outcome: null, yesPool: 2100, noPool: 4800, status: "open",
    featured: false, aiGenerated: true, totalBettors: 567,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ⚡ MICRO / FLASH (instant action, 15 min to 4 hours)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "pulse-m9",
    title: "Will BTC move more than 0.5% in the next 15 minutes?",
    description: "Measured on Binance BTCUSDT from market open time.",
    category: "micro",
    closesAt: minutesFromNow(13),
    resolvesAt: minutesFromNow(15),
    outcome: null, yesPool: 340, noPool: 410, status: "open",
    totalBettors: 89,
  },
  {
    id: "pulse-m10",
    title: "Will ETH gas fees exceed 15 gwei in the next hour?",
    description: "Average gas price on Ethereum mainnet.",
    category: "micro",
    closesAt: hoursFromNow(1),
    resolvesAt: hoursFromNow(1),
    outcome: null, yesPool: 620, noPool: 480, status: "open",
    totalBettors: 143,
  },
  {
    id: "pulse-hot-mi1",
    title: "Will BTC be higher or lower than now in exactly 2 hours?",
    description: "Binance BTC/USDT spot price at close time vs. price at bet-open time.",
    category: "micro",
    closesAt: hoursFromNow(2),
    resolvesAt: hoursFromNow(2),
    outcome: null, yesPool: 1400, noPool: 1100, status: "open",
    featured: false, aiGenerated: false, totalBettors: 234,
  },
  {
    id: "pulse-hot-mi2",
    title: "Will SOL hit $200 in the next 4 hours?",
    description: "Binance SOL/USDT spot reaches $200 at any moment in the next 4 hours.",
    category: "micro",
    closesAt: hoursFromNow(4),
    resolvesAt: hoursFromNow(4),
    outcome: null, yesPool: 800, noPool: 1900, status: "open",
    featured: false, aiGenerated: true, totalBettors: 178,
  },
  {
    id: "pulse-hot-mi3",
    title: "Will WLD pump more than 5% today?",
    description: "Binance WLD/USDT 24h change > +5% at UTC midnight close.",
    category: "micro",
    closesAt: hoursFromNow(12),
    resolvesAt: hoursFromNow(13),
    outcome: null, yesPool: 1100, noPool: 1600, status: "open",
    featured: false, aiGenerated: false, totalBettors: 312,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 🎯 PULSE EXCLUSIVE (World ID community)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "pulse-m4",
    title: "Will Real Madrid win the 2025-26 Champions League?",
    description: "Resolved at the final whistle of the UCL Final.",
    category: "sports",
    closesAt: daysFromNow(18),
    resolvesAt: daysFromNow(19),
    outcome: null, yesPool: 5600, noPool: 4200, status: "open",
    totalBettors: 562,
  },
  {
    id: "pulse-m12",
    title: "Will LeBron James announce retirement before January 2027?",
    description: "Official statement from player, team, or NBA.",
    category: "sports",
    closesAt: daysFromNow(210),
    resolvesAt: daysFromNow(212),
    outcome: null, yesPool: 1900, noPool: 3100, status: "open",
    totalBettors: 276,
  },
  {
    id: "pulse-m5",
    title: "Will a new country adopt Bitcoin as legal tender in 2026?",
    description: "Must be a UN-recognized nation passing formal legislation.",
    category: "world",
    closesAt: daysFromNow(180),
    resolvesAt: daysFromNow(182),
    outcome: null, yesPool: 1800, noPool: 5200, status: "open",
    aiGenerated: true, totalBettors: 447,
  },
  {
    id: "pulse-excl-1",
    title: "Will PULSE hit 10,000 verified forecasters this month?",
    description: "Unique World ID nullifiers that have placed at least 1 bet.",
    category: "world",
    closesAt: daysFromNow(24),
    resolvesAt: daysFromNow(25),
    outcome: null, yesPool: 2400, noPool: 900, status: "open",
    aiGenerated: false, totalBettors: 347,
  },
  {
    id: "pulse-excl-2",
    title: "Will Worldcoin announce a new country partnership in June 2026?",
    description: "Official Worldcoin or Tools for Humanity press release or blog post.",
    category: "world",
    closesAt: daysFromNow(24),
    resolvesAt: daysFromNow(25),
    outcome: null, yesPool: 3600, noPool: 1200, status: "open",
    aiGenerated: false, totalBettors: 531,
  },
  {
    id: "pulse-excl-3",
    title: "Will World App add a new mini app category this quarter?",
    description: "Official World App store gets a new category tab/section this quarter.",
    category: "world",
    closesAt: daysFromNow(80),
    resolvesAt: daysFromNow(82),
    outcome: null, yesPool: 1700, noPool: 2100, status: "open",
    aiGenerated: true, totalBettors: 224,
  },
];

// ── Leaderboard seed ──────────────────────────────────────────────────────────

export const seedLeaderboard: PulseLeaderEntry[] = [
  { rank: 1,  username: "@oracle_signal",  initial: "O", winRate: 94, totalBets: 186, totalWonWld: 2840, streak: 22, specialty: "Crypto",  badge: "🏆" },
  { rank: 2,  username: "@signal_seven",   initial: "S", winRate: 87, totalBets: 241, totalWonWld: 1970, streak: 14, specialty: "World",   badge: "🥈" },
  { rank: 3,  username: "@forecast_mind",  initial: "F", winRate: 83, totalBets: 128, totalWonWld: 1540, streak: 9,  specialty: "Sports",  badge: "🥉" },
  { rank: 4,  username: "@chain_prophet",  initial: "C", winRate: 79, totalBets: 312, totalWonWld: 1280, streak: 7,  specialty: "Crypto"  },
  { rank: 5,  username: "@true_north_w",   initial: "T", winRate: 76, totalBets: 94,  totalWonWld: 980,  streak: 11, specialty: "Culture" },
  { rank: 6,  username: "@market_vision",  initial: "M", winRate: 74, totalBets: 156, totalWonWld: 860,  streak: 5,  specialty: "World"   },
  { rank: 7,  username: "@deep_read_x",    initial: "D", winRate: 71, totalBets: 87,  totalWonWld: 720,  streak: 3,  specialty: "Sports"  },
  { rank: 8,  username: "@verified_sage",  initial: "V", winRate: 68, totalBets: 203, totalWonWld: 590,  streak: 6,  specialty: "Micro"   },
  { rank: 9,  username: "@pulse_reader",   initial: "P", winRate: 65, totalBets: 74,  totalWonWld: 440,  streak: 2,  specialty: "Crypto"  },
  { rank: 10, username: "@world_eye",      initial: "W", winRate: 62, totalBets: 118, totalWonWld: 310,  streak: 4,  specialty: "World"   },
];

// ── Fee constants ─────────────────────────────────────────────────────────────
export const PLATFORM_FEE_BPS = 30;   // 0.30% standard bets
export const CLASH_RAKE_BPS   = 1000; // 10.0% 1v1 Clash
export const FLASH_FEE_BPS    = 50;   // 0.50% micro/flash markets

// ── Streak multiplier table ───────────────────────────────────────────────────
export const STREAK_MULTIPLIERS = [
  { minStreak: 20, multiplier: 1.5,  label: "🔥 LEGENDARY" },
  { minStreak: 10, multiplier: 1.25, label: "⚡ HOT STREAK" },
  { minStreak: 5,  multiplier: 1.1,  label: "✨ ON FIRE"   },
  { minStreak: 0,  multiplier: 1.0,  label: ""             },
];

export function getStreakMultiplier(streak: number): { multiplier: number; label: string } {
  for (const tier of STREAK_MULTIPLIERS) {
    if (streak >= tier.minStreak) return { multiplier: tier.multiplier, label: tier.label };
  }
  return { multiplier: 1.0, label: "" };
}
