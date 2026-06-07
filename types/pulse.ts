export type PulseCategory = "all" | "crypto" | "sports" | "world" | "culture" | "micro";

export type PulseMarketStatus = "open" | "closed" | "resolved" | "cancelled";

export type PulseMarket = {
  id: string;
  title: string;
  description?: string;
  category: Exclude<PulseCategory, "all">;
  closesAt: string;
  resolvesAt: string;
  outcome: "yes" | "no" | null;
  yesPool: number;
  noPool: number;
  status: PulseMarketStatus;
  featured?: boolean;
  aiGenerated?: boolean;
  totalBettors?: number;
};

export type PulseBet = {
  id: string;
  marketId: string;
  marketTitle: string;
  position: "yes" | "no";
  amountWld: number;
  placedAt: string;
  confirmed: boolean;
  payout?: number;
  settled?: boolean;
};

export type PulseGoal = {
  id: string;
  title: string;
  description?: string;
  deadline: string;
  stakeWld: number;
  yesPool: number;
  noPool: number;
  status: "active" | "completed" | "failed" | "cancelled";
  createdAt: string;
  evidence?: string;
};

export type PulsePlayerStats = {
  totalBets: number;
  totalWagered: number;
  totalWon: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
};

export type PulseLeaderEntry = {
  rank: number;
  username: string;
  initial: string;
  winRate: number;
  totalBets: number;
  totalWonWld: number;
  streak: number;
  specialty: string;
  badge?: string;
};

export type PulseClashStatus = "pending" | "active" | "resolved" | "expired";

export type PulseClash = {
  id: string;
  marketId: string;
  marketTitle: string;
  creatorNullifier: string;
  creatorUsername?: string;
  creatorPosition: "yes" | "no";
  challengerPosition: "yes" | "no";
  stakeWld: number;
  creatorTxRef: string;
  challengerNullifier?: string;
  challengerUsername?: string;
  challengerTxRef?: string;
  status: PulseClashStatus;
  winnerNullifier?: string;
  payoutWld?: number;
  createdAt: string;
  expiresAt: string;
};

export type PulseCopyFollow = {
  leaderNullifier: string;
  leaderUsername: string;
  copyFraction: number;
  since: string;
};

export type PulseTab = "markets" | "mybets" | "clash" | "leagues" | "goals";
