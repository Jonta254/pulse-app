export type VerdexCategory = "all" | "crypto" | "sports" | "world" | "culture" | "micro";

export type VerdexMarketStatus = "open" | "closed" | "resolved" | "cancelled";

export type VerdexMarket = {
  id: string;
  title: string;
  description?: string;
  category: Exclude<VerdexCategory, "all">;
  closesAt: string;
  resolvesAt: string;
  outcome: "yes" | "no" | null;
  yesPool: number;
  noPool: number;
  status: VerdexMarketStatus;
  featured?: boolean;
  aiGenerated?: boolean;
  totalBettors?: number;
};

export type VerdexBet = {
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

export type VerdexGoal = {
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

export type VerdexPlayerStats = {
  totalBets: number;
  totalWagered: number;
  totalWon: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
};

export type VerdexLeaderEntry = {
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

export type VerdexClashStatus = "pending" | "active" | "resolved" | "expired";

export type VerdexClash = {
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
  status: VerdexClashStatus;
  winnerNullifier?: string;
  payoutWld?: number;
  createdAt: string;
  expiresAt: string;
};

export type VerdexCopyFollow = {
  leaderNullifier: string;
  leaderUsername: string;
  copyFraction: number;
  since: string;
};

export type VerdexTab = "markets" | "mybets" | "clash" | "leagues" | "goals";
