"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, Copy, Swords, Target, Trophy, TrendingUp, UserMinus, UserPlus, Users, X, Zap } from "lucide-react";
// Use tiny client seed (3 markets) instead of full 601-line data.ts
// The full seed is server-side only (API routes). This keeps the browser bundle small.
import { clientSeedMarkets as seedMarkets, clientSeedLeaderboard as seedLeaderboard } from "@/lib/verdex/clientSeed";
import {
  addBetToLocalPools,
  applyLocalPools,
  calcOdds,
  calcPlayerStats,
  calcPotentialPayout,
  calcYesPct,
  categoryMeta,
  formatCountdown,
  formatPoolSize,
  loadVerdexBets,
  loadVerdexGoals,
  saveVerdexBets,
  saveVerdexGoals,
} from "@/lib/verdex/utils";
import {
  clashOpponent,
  clashStatusLabel,
  getClashShareUrl,
  isFollowing,
  loadCopyFollows,
  loadLocalClashes,
  readClashIdFromUrl,
  saveLocalClashes,
  toggleFollow,
  upsertLocalClash,
} from "@/lib/verdex/clash";
import type { VerdexBet, VerdexCategory, VerdexClash, VerdexCopyFollow, VerdexGoal, VerdexMarket, VerdexTab } from "@/types/verdex";
import type { EarnPoints, OpenPayment } from "@/types/ui";
import type { HistoryRecord } from "@/types/reputation";
import type { VerifiedHuman } from "@/types/user";
import type { VerdexTheme } from "@/lib/verdex/theme";
import { ProfileSheet, ProfileTrigger } from "./ProfileSheet";
import { WinningsPanel } from "./WinningsPanel";

// ── Props ─────────────────────────────────────────────────────────────────────

type VerdexViewProps = {
  earnPoints: EarnPoints;
  humanIdentity: VerifiedHuman | null;
  openPayment: OpenPayment;
  recordHistory: (record: Omit<HistoryRecord, "id" | "time">) => void;
  theme: VerdexTheme;
  onThemeToggle: () => void;
  onSignOut: () => void;
};

// ── Sub-components ────────────────────────────────────────────────────────────

function CountdownChip({ closesAt }: { closesAt: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  void tick;
  const { label, urgent, expired } = formatCountdown(closesAt);
  return (
    <span className={`verdex-chip verdex-chip-time${urgent ? " urgent" : ""}${expired ? " expired" : ""}`}>
      {expired ? "🔒 Closed" : `⏱ ${label}`}
    </span>
  );
}

function PoolBar({ yesPool, noPool }: { yesPool: number; noPool: number }) {
  const yesPct = calcYesPct(yesPool, noPool);
  return (
    <div className="verdex-pool-bar-wrap">
      <div className="verdex-pool-bar">
        <div className="verdex-pool-bar-yes" style={{ width: `${yesPct}%` }} />
      </div>
      <div className="verdex-pool-labels">
        <span className="verdex-yes-label">YES {yesPct}%</span>
        <span className="verdex-no-label">NO {100 - yesPct}%</span>
      </div>
    </div>
  );
}

function CategoryPill({
  cat,
  active,
  onClick,
}: {
  cat: VerdexCategory;
  active: boolean;
  onClick: () => void;
}) {
  const meta = categoryMeta[cat];
  return (
    <button
      className={`verdex-cat-pill${active ? " active" : ""}`}
      onClick={onClick}
      style={active ? { borderColor: meta.color, background: `${meta.color}22`, color: meta.color } : {}}
      type="button"
    >
      {meta.emoji} {meta.label}
    </button>
  );
}

function MarketCard({
  market,
  myBet,
  onBet,
  onClash,
}: {
  market: VerdexMarket;
  myBet: VerdexBet | undefined;
  onBet: (market: VerdexMarket, position: "yes" | "no") => void;
  onClash: (market: VerdexMarket) => void;
}) {
  const { expired } = formatCountdown(market.closesAt);
  const meta = categoryMeta[market.category];
  const total = market.yesPool + market.noPool;

  return (
    <article className={`verdex-market-card${market.featured ? " featured" : ""}`}>
      {market.featured && <div className="verdex-featured-tag">⭐ Featured</div>}
      <div className="verdex-market-card-top">
        <span className="verdex-cat-tag" style={{ color: meta.color, borderColor: `${meta.color}44`, background: `${meta.color}18` }}>
          {meta.emoji} {meta.label.toUpperCase()}
        </span>
        <CountdownChip closesAt={market.closesAt} />
        {market.aiGenerated && <span className="verdex-ai-tag">🤖 AI</span>}
      </div>

      <h3 className="verdex-market-title">{market.title}</h3>

      <PoolBar yesPool={market.yesPool} noPool={market.noPool} />

      <div className="verdex-market-meta">
        <span>🏦 {formatPoolSize(total)}</span>
        <span>👥 {market.totalBettors?.toLocaleString() ?? "—"} humans</span>
      </div>

      {myBet ? (
        <div className={`verdex-my-bet-badge ${myBet.position}`}>
          ✓ You bet {myBet.amountWld} WLD on <strong>{myBet.position.toUpperCase()}</strong>
        </div>
      ) : expired ? (
        <div className="verdex-market-closed-note">Market closed — awaiting resolution</div>
      ) : (
        <>
          <div className="verdex-bet-row">
            <button className="verdex-bet-yes" onClick={() => onBet(market, "yes")} type="button">
              BET YES {calcOdds("yes", market.yesPool, market.noPool)}
            </button>
            <button className="verdex-bet-no" onClick={() => onBet(market, "no")} type="button">
              BET NO {calcOdds("no", market.yesPool, market.noPool)}
            </button>
          </div>
          <button
            className={`verdex-clash-trigger${market.category === "sports" ? " hot" : ""}`}
            onClick={() => onClash(market)}
            type="button"
          >
            <Swords size={13} />
            {market.category === "sports" ? "Challenge a friend — winner takes 90%" : "Challenge a human 1v1"}
          </button>
        </>
      )}
    </article>
  );
}

// ── Bet Sheet ─────────────────────────────────────────────────────────────────

const BET_CHIPS = [0.5, 1, 2, 5];

function BetSheet({
  market,
  initialPosition,
  onClose,
  onConfirm,
}: {
  market: VerdexMarket;
  initialPosition: "yes" | "no";
  onClose: () => void;
  onConfirm: (position: "yes" | "no", amount: number) => void;
}) {
  const [position, setPosition] = useState<"yes" | "no">(initialPosition);
  const [amount, setAmount] = useState(1);
  const [custom, setCustom] = useState("");
  const finalAmount = custom ? parseFloat(custom) || 0 : amount;
  const payout = calcPotentialPayout(finalAmount, position, market.yesPool, market.noPool);
  const profit = Math.round((payout - finalAmount) * 100) / 100;

  return (
    <div className="verdex-sheet-backdrop" onClick={onClose} role="presentation">
      <div className="verdex-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Place bet">
        <div className="verdex-sheet-handle" />

        <div className="verdex-sheet-header">
          <div>
            <span className="verdex-sheet-kicker">Place your forecast</span>
            <strong className="verdex-sheet-title">{market.title}</strong>
          </div>
          <button className="verdex-sheet-close" onClick={onClose} type="button" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Position toggle */}
        <div className="verdex-position-toggle">
          <button
            className={`verdex-pos-yes${position === "yes" ? " active" : ""}`}
            onClick={() => setPosition("yes")}
            type="button"
          >
            <span>YES</span>
            <small>{calcOdds("yes", market.yesPool, market.noPool)}</small>
          </button>
          <button
            className={`verdex-pos-no${position === "no" ? " active" : ""}`}
            onClick={() => setPosition("no")}
            type="button"
          >
            <span>NO</span>
            <small>{calcOdds("no", market.yesPool, market.noPool)}</small>
          </button>
        </div>

        {/* Amount chips */}
        <div className="verdex-amount-label">Stake amount (WLD)</div>
        <div className="verdex-amount-chips">
          {BET_CHIPS.map((chip) => (
            <button
              key={chip}
              className={`verdex-amount-chip${amount === chip && !custom ? " active" : ""}`}
              onClick={() => { setAmount(chip); setCustom(""); }}
              type="button"
            >
              {chip}
            </button>
          ))}
          <input
            className="verdex-amount-custom"
            inputMode="decimal"
            max="100"
            min="0.1"
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Custom"
            step="0.1"
            type="number"
            value={custom}
          />
        </div>

        {/* Payout estimate */}
        <div className="verdex-payout-box">
          <div className="verdex-payout-row">
            <span>Your stake</span>
            <strong>{finalAmount > 0 ? `${finalAmount} WLD` : "—"}</strong>
          </div>
          <div className="verdex-payout-row">
            <span>Potential payout</span>
            <strong className="verdex-payout-highlight">{finalAmount > 0 ? `${payout} WLD` : "—"}</strong>
          </div>
          <div className="verdex-payout-row">
            <span>Potential profit</span>
            <strong className={profit > 0 ? "verdex-profit-pos" : "verdex-profit-neg"}>
              {finalAmount > 0 ? `+${profit} WLD` : "—"}
            </strong>
          </div>
        </div>

        <button
          className={`verdex-confirm-btn ${position}`}
          disabled={finalAmount <= 0 || finalAmount > 100}
          onClick={() => onConfirm(position, finalAmount)}
          type="button"
        >
          <Zap size={16} />
          Place {finalAmount > 0 ? `${finalAmount} WLD` : ""} on {position.toUpperCase()}
        </button>

        <p className="verdex-sheet-note">
          Platform takes a 2% fee from the losing pool. Payout depends on final pool size at close.
        </p>
      </div>
    </div>
  );
}

// ── Clash Sheet ───────────────────────────────────────────────────────────────

function ClashSheet({
  market,
  onClose,
  onConfirm,
}: {
  market: VerdexMarket;
  onClose: () => void;
  onConfirm: (position: "yes" | "no", amount: number) => void;
}) {
  const [position, setPosition] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState(1);

  return (
    <div className="verdex-sheet-backdrop" onClick={onClose} role="presentation">
      <div className="verdex-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Create clash">
        <div className="verdex-sheet-handle" />
        <div className="verdex-sheet-header">
          <div>
            <span className="verdex-sheet-kicker">⚔️ 1v1 Clash — 10% rake</span>
            <strong className="verdex-sheet-title">{market.title}</strong>
          </div>
          <button className="verdex-sheet-close" onClick={onClose} type="button" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="verdex-clash-how">
          <Swords size={14} />
          <span>Stake WLD on your position. Share the link. If a human accepts the opposite side, the winner takes 90%.</span>
        </div>

        <div className="verdex-position-toggle">
          <button className={`verdex-pos-yes${position === "yes" ? " active" : ""}`} onClick={() => setPosition("yes")} type="button">
            <span>YES</span><small>You think it happens</small>
          </button>
          <button className={`verdex-pos-no${position === "no" ? " active" : ""}`} onClick={() => setPosition("no")} type="button">
            <span>NO</span><small>You think it does not</small>
          </button>
        </div>

        <div className="verdex-amount-label">Stake (WLD) — challenger must match</div>
        <div className="verdex-amount-chips">
          {[0.5, 1, 2, 5].map((chip) => (
            <button key={chip} className={`verdex-amount-chip${amount === chip ? " active" : ""}`} onClick={() => setAmount(chip)} type="button">{chip}</button>
          ))}
        </div>

        <div className="verdex-payout-box">
          <div className="verdex-payout-row"><span>Your stake</span><strong>{amount} WLD</strong></div>
          <div className="verdex-payout-row"><span>Challenger stakes</span><strong>{amount} WLD</strong></div>
          <div className="verdex-payout-row"><span>Winner takes</span><strong className="verdex-payout-highlight">{Math.round(amount * 2 * 0.9 * 100) / 100} WLD</strong></div>
          <div className="verdex-payout-row"><span>Platform fee</span><strong>{Math.round(amount * 2 * 0.1 * 100) / 100} WLD (10%)</strong></div>
        </div>

        <button className={`verdex-confirm-btn ${position}`} onClick={() => onConfirm(position, amount)} type="button">
          <Swords size={16} /> Create Clash — Stake {amount} WLD
        </button>
        <p className="verdex-sheet-note">After payment, you get a shareable link. Clash expires in 24h if unchallenged.</p>
      </div>
    </div>
  );
}

// ── Clash Accept Modal ────────────────────────────────────────────────────────

function ClashAcceptModal({
  clash,
  myNullifier,
  onClose,
  onAccept,
}: {
  clash: VerdexClash;
  myNullifier: string;
  onClose: () => void;
  onAccept: (clash: VerdexClash) => void;
}) {
  const alreadyAccepted = clash.challengerNullifier === myNullifier;
  const isOwner = clash.creatorNullifier === myNullifier;

  return (
    <div className="verdex-sheet-backdrop" onClick={onClose} role="presentation">
      <div className="verdex-sheet verdex-clash-accept" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Clash challenge">
        <div className="verdex-sheet-handle" />
        <div className="verdex-clash-accept-hero">
          <Swords size={36} />
          <strong>{isOwner ? "Your clash is pending" : "⚔️ You have been challenged!"}</strong>
        </div>

        <div className="verdex-clash-accept-market">
          <span className="verdex-sheet-kicker">The market</span>
          <p>{clash.marketTitle}</p>
        </div>

        <div className="verdex-clash-accept-sides">
          <div className="clash-side yes">
            <span>Creator bets</span>
            <strong>YES</strong>
            <small>{clash.creatorUsername ?? "Challenger"}</small>
          </div>
          <div className="clash-vs">VS</div>
          <div className="clash-side no">
            <span>You bet</span>
            <strong>NO</strong>
            <small>You</small>
          </div>
        </div>

        <div className="verdex-payout-box">
          <div className="verdex-payout-row"><span>Each stakes</span><strong>{clash.stakeWld} WLD</strong></div>
          <div className="verdex-payout-row"><span>Winner takes</span><strong className="verdex-payout-highlight">{Math.round(clash.stakeWld * 2 * 0.9 * 100) / 100} WLD</strong></div>
        </div>

        {isOwner || alreadyAccepted ? (
          <div className="verdex-clash-accepted-note">
            {alreadyAccepted ? "✅ You already accepted this clash." : "⏳ Waiting for a challenger to accept."}
          </div>
        ) : (
          <button className="verdex-confirm-btn no" onClick={() => onAccept(clash)} type="button">
            <Swords size={16} /> Accept Challenge — Stake {clash.stakeWld} WLD
          </button>
        )}
        <button className="verdex-goal-cancel-btn" onClick={onClose} style={{ width: "100%" }} type="button">Close</button>
      </div>
    </div>
  );
}

// ── Goal Sheet ────────────────────────────────────────────────────────────────

function GoalSheet({ onClose, onSave }: { onClose: () => void; onSave: (g: Omit<VerdexGoal, "id" | "createdAt" | "yesPool" | "noPool" | "status">) => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [stake, setStake] = useState(1);
  const [days, setDays] = useState(7);

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + days);

  return (
    <div className="verdex-sheet-backdrop" onClick={onClose} role="presentation">
      <div className="verdex-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="New goal">
        <div className="verdex-sheet-handle" />
        <div className="verdex-sheet-header">
          <div>
            <span className="verdex-sheet-kicker">New personal goal</span>
            <strong className="verdex-sheet-title">Stake your reputation on it</strong>
          </div>
          <button className="verdex-sheet-close" onClick={onClose} type="button" aria-label="Close"><X size={18} /></button>
        </div>

        <label className="verdex-field-label">
          What will you achieve?
          <input
            className="verdex-field-input"
            maxLength={100}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. I will run 5km three times this week"
            type="text"
            value={title}
          />
        </label>

        <label className="verdex-field-label">
          Details (optional)
          <input
            className="verdex-field-input"
            maxLength={200}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="How will this be verified?"
            type="text"
            value={desc}
          />
        </label>

        <div className="verdex-goal-row">
          <label className="verdex-field-label" style={{ flex: 1 }}>
            Stake (WLD)
            <select className="verdex-field-input" onChange={(e) => setStake(Number(e.target.value))} value={stake}>
              {[0.5, 1, 2, 5].map((v) => <option key={v} value={v}>{v} WLD</option>)}
            </select>
          </label>
          <label className="verdex-field-label" style={{ flex: 1 }}>
            Deadline
            <select className="verdex-field-input" onChange={(e) => setDays(Number(e.target.value))} value={days}>
              {[3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} days</option>)}
            </select>
          </label>
        </div>

        <div className="verdex-goal-preview">
          <Zap size={14} />
          <span>Friends can back you (YES) or doubt you (NO). Backers split your stake if you fail; you keep it if you succeed.</span>
        </div>

        <button
          className="verdex-confirm-btn yes"
          disabled={title.trim().length < 6}
          onClick={() => onSave({ title: title.trim(), description: desc.trim(), deadline: deadline.toISOString(), stakeWld: stake })}
          type="button"
        >
          <Target size={16} />
          Create Goal — Stake {stake} WLD
        </button>
      </div>
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar({ stats }: { stats: ReturnType<typeof calcPlayerStats> }) {
  return (
    <div className="verdex-stats-bar">
      <div className="verdex-stat">
        <strong>{stats.totalBets}</strong>
        <span>Bets</span>
      </div>
      <div className="verdex-stat">
        <strong>{stats.winRate}%</strong>
        <span>Win Rate</span>
      </div>
      <div className="verdex-stat">
        <strong>{stats.totalWon > 0 ? `${stats.totalWon}` : "—"}</strong>
        <span>WLD Won</span>
      </div>
      <div className="verdex-stat">
        <strong>{stats.currentStreak > 0 ? `🔥${stats.currentStreak}` : "—"}</strong>
        <span>Streak</span>
      </div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function VerdexView({ earnPoints, humanIdentity, openPayment, recordHistory, theme, onThemeToggle, onSignOut }: VerdexViewProps) {
  const [verdexTab, setVerdexTab] = useState<VerdexTab>("markets");
  const [category, setCategory] = useState<VerdexCategory>("all");
  const [bets, setBets] = useState<VerdexBet[]>(loadVerdexBets);
  const [goals, setGoals] = useState<VerdexGoal[]>(loadVerdexGoals);
  const [clashes, setClashes] = useState<VerdexClash[]>(loadLocalClashes);
  const [copyFollows, setCopyFollows] = useState<VerdexCopyFollow[]>(loadCopyFollows);
  const [betSheet, setBetSheet] = useState<{ market: VerdexMarket; position: "yes" | "no" } | null>(null);
  const [clashSheet, setClashSheet] = useState<VerdexMarket | null>(null);
  const [clashAccept, setClashAccept] = useState<VerdexClash | null>(null);
  const [pendingShareClash, setPendingShareClash] = useState<VerdexClash | null>(null);
  const [goalSheet, setGoalSheet] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [localMarkets, setLocalMarkets] = useState<VerdexMarket[]>(() => applyLocalPools(seedMarkets));
  // Real players only — starts empty until the DB returns actual rankings
  const [leaderboard, setLeaderboard] = useState<typeof seedLeaderboard>([]);
  const stats = calcPlayerStats(bets);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Persist bets, goals, clashes
  useEffect(() => { saveVerdexBets(bets); }, [bets]);
  useEffect(() => { saveVerdexGoals(goals); }, [goals]);
  useEffect(() => { saveLocalClashes(clashes); }, [clashes]);

  // Deeplink: ?verdex_clash=CLASH_ID → show accept modal
  useEffect(() => {
    const clashId = readClashIdFromUrl();
    if (!clashId) return;
    fetch(`/api/verdex/clash/${clashId}`)
      .then((r) => r.json())
      .then((payload: { ok: boolean; clash?: VerdexClash }) => {
        if (payload.ok && payload.clash) {
          setClashAccept(payload.clash);
          setVerdexTab("clash");
        }
      })
      .catch(() => null);
  }, []);

  // ── Fetch markets from API (auto-refresh every 3 min) ──────────────────────
  const fetchMarkets = useCallback(async (cat: string) => {
    try {
      const res = await fetch(`/api/verdex/markets?category=${cat}`, { cache: "no-store" });
      const payload = await res.json() as { ok: boolean; markets?: VerdexMarket[] };
      if (payload.ok && payload.markets?.length) {
        setLocalMarkets(applyLocalPools(payload.markets));
      }
    } catch {
      // keep seed data on network failure
    }
  }, []);

  useEffect(() => {
    void fetchMarkets(category);
    // Refresh every 3 minutes so markets stay live without full reload
    const t = setInterval(() => void fetchMarkets(category), 3 * 60_000);
    return () => clearInterval(t);
  }, [category, fetchMarkets]);

  // ── Fetch flash markets (auto-refresh every 60 sec) ─────────────────────────
  const [flashMarkets, setFlashMarkets] = useState<VerdexMarket[]>([]);
  useEffect(() => {
    async function loadFlash() {
      try {
        const res = await fetch("/api/verdex/flash", { cache: "no-store" });
        const payload = await res.json() as { ok: boolean; markets?: VerdexMarket[] };
        if (payload.ok && payload.markets?.length) setFlashMarkets(payload.markets);
      } catch { /* silent */ }
    }
    void loadFlash();
    const t = setInterval(loadFlash, 60_000);
    return () => clearInterval(t);
  }, []);

  // ── Fetch leaderboard from API ──────────────────────────────────────────────
  useEffect(() => {
    if (verdexTab !== "leagues") return;
    fetch("/api/verdex/leaderboard", { cache: "no-store" })
      .then((r) => r.json())
      .then((payload: { ok: boolean; leaderboard?: typeof seedLeaderboard }) => {
        if (payload.ok && Array.isArray(payload.leaderboard)) setLeaderboard(payload.leaderboard);
      })
      .catch(() => null);
  }, [verdexTab]);

  // ── Sync My Bets with server truth: settled, payout, refunds ───────────────
  useEffect(() => {
    if (verdexTab !== "mybets") return;
    const wallet = humanIdentity?.wallet ?? "";
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) return;

    type ServerBet = { id: string; marketId: string; marketTitle: string; position: "yes" | "no"; amountWld: number; payout?: number; settled: boolean; placedAt: string };
    fetch(`/api/verdex/bets?nullifier=${wallet}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((payload: { ok: boolean; bets?: ServerBet[] }) => {
        if (!payload.ok || !payload.bets) return;
        setBets((prev) => {
          const byId = new Map(prev.map((b) => [b.id, b]));
          for (const sb of payload.bets ?? []) {
            const existing = byId.get(sb.id);
            byId.set(sb.id, {
              id: sb.id,
              marketId: sb.marketId,
              marketTitle: sb.marketTitle || existing?.marketTitle || "Market",
              position: sb.position,
              amountWld: sb.amountWld,
              placedAt: existing?.placedAt ?? sb.placedAt,
              confirmed: true,
              payout: sb.payout ?? existing?.payout,
              settled: sb.settled || existing?.settled,
            });
          }
          return [...byId.values()].sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
        });
      })
      .catch(() => null);
  }, [verdexTab, humanIdentity]);

  // ── Filter markets ──────────────────────────────────────────────────────────
  const filtered = category === "all" ? localMarkets : localMarkets.filter((m) => m.category === category);

  // Micro markets first if selected
  const sorted = category === "micro"
    ? [...filtered].sort((a, b) => new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime())
    : [...filtered].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

  // ── Bet handler ─────────────────────────────────────────────────────────────
  function handleBetConfirm(position: "yes" | "no", amount: number) {
    if (!betSheet) return;
    const market = betSheet.market;
    setBetSheet(null);

    openPayment({
      title: `Bet ${amount} WLD on ${position.toUpperCase()}`,
      amount: amount.toFixed(2),
      detail: `VeRdex bet: "${market.title}"`,
      feature: "tip-verdex",
      allowCustomAmount: false,
      success: `${amount} WLD bet placed on ${position.toUpperCase()}! Awaiting resolution.`,
      onConfirmed: async (_amount, txReference) => {
        const betId = `verdex-bet-${Date.now()}`;
        const newBet: VerdexBet = {
          id: betId,
          marketId: market.id,
          marketTitle: market.title,
          position,
          amountWld: amount,
          placedAt: new Date().toISOString(),
          confirmed: true,
        };
        setBets((prev) => [newBet, ...prev]);
        addBetToLocalPools(market.id, position, amount, market);
        setLocalMarkets((prev) => prev.map((m) => {
          if (m.id !== market.id) return m;
          return {
            ...m,
            yesPool: position === "yes" ? m.yesPool + amount : m.yesPool,
            noPool: position === "no" ? m.noPool + amount : m.noPool,
            totalBettors: (m.totalBettors ?? 0) + 1,
          };
        }));
        // Record to Supabase with the REAL tx reference from World Chain
        fetch("/api/verdex/bet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: betId,
            marketId: market.id,
            worldNullifier: humanIdentity?.wallet ?? "preview",
            username: humanIdentity?.username ?? undefined,
            position,
            amountWld: amount,
            txReference: txReference ?? `verdex-${betId}`,
          }),
        }).catch(() => null);
        earnPoints(5, `VeRdex bet placed: ${amount} WLD on ${position.toUpperCase()}`);
        recordHistory({ title: "VeRdex bet placed", detail: `Bet ${amount} WLD on ${position.toUpperCase()}: "${market.title}"`, kind: "payment" });
      },
    });
  }

  // ── Clash handlers ──────────────────────────────────────────────────────────
  function handleClashCreate(position: "yes" | "no", amount: number) {
    if (!clashSheet) return;
    const market = clashSheet;
    setClashSheet(null);

    openPayment({
      title: `Clash stake: ${amount} WLD on ${position.toUpperCase()}`,
      amount: amount.toFixed(2),
      detail: `VeRdex 1v1 Clash: "${market.title}"`,
      feature: "tip-verdex",
      allowCustomAmount: false,
      success: "Clash created! Share the link to find a challenger.",
      onConfirmed: async (_amt, _txRef) => {
        const clashId = `clash-${Date.now()}`;
        const newClash: VerdexClash = {
          id: clashId,
          marketId: market.id,
          marketTitle: market.title,
          creatorNullifier: humanIdentity?.wallet ?? "preview",
          creatorUsername: humanIdentity?.username ?? undefined,
          creatorPosition: position,
          challengerPosition: position === "yes" ? "no" : "yes",
          stakeWld: amount,
          creatorTxRef: `clash-${clashId}`,
          status: "pending",
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
        setClashes((prev) => [newClash, ...prev]);
        upsertLocalClash(newClash);
        setPendingShareClash(newClash);
        setVerdexTab("clash");

        fetch("/api/verdex/clash/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: clashId,
            marketId: market.id,
            marketTitle: market.title,
            creatorNullifier: humanIdentity?.wallet ?? "preview",
            creatorUsername: humanIdentity?.username ?? undefined,
            creatorPosition: position,
            stakeWld: amount,
            creatorTxRef: `clash-${clashId}`,
          }),
        }).catch(() => null);

        earnPoints(8, `VeRdex Clash created: ${amount} WLD on ${position.toUpperCase()}`);
        recordHistory({ title: "VeRdex Clash created", detail: `Created 1v1 Clash: ${amount} WLD on ${position.toUpperCase()} — "${market.title}"`, kind: "payment" });
      },
    });
  }

  function handleClashAccept(clash: VerdexClash) {
    setClashAccept(null);
    openPayment({
      title: `Accept Clash: ${clash.stakeWld} WLD on ${clash.challengerPosition.toUpperCase()}`,
      amount: clash.stakeWld.toFixed(2),
      detail: `VeRdex Clash: "${clash.marketTitle}"`,
      feature: "tip-verdex",
      allowCustomAmount: false,
      success: "Clash accepted! May the best forecaster win.",
      onConfirmed: async (_amt, _txRef) => {
        const updated: VerdexClash = { ...clash, challengerNullifier: humanIdentity?.wallet ?? "preview", challengerUsername: humanIdentity?.username ?? undefined, status: "active" };
        setClashes((prev) => {
          const existing = prev.find((c) => c.id === clash.id);
          if (existing) return prev.map((c) => c.id === clash.id ? updated : c);
          return [updated, ...prev];
        });
        upsertLocalClash(updated);

        fetch("/api/verdex/clash/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clashId: clash.id,
            challengerNullifier: humanIdentity?.wallet ?? "preview",
            challengerUsername: humanIdentity?.username ?? undefined,
            txRef: `accept-${clash.id}-${Date.now()}`,
          }),
        }).catch(() => null);

        earnPoints(5, `VeRdex Clash accepted: ${clash.stakeWld} WLD`);
        recordHistory({ title: "VeRdex Clash accepted", detail: `Accepted ${clash.stakeWld} WLD Clash on "${clash.marketTitle}"`, kind: "payment" });
      },
    });
  }

  function handleCopyToggle(leader: { nullifier: string; username: string }) {
    const isNowFollowing = toggleFollow(leader);
    setCopyFollows(loadCopyFollows());
    earnPoints(isNowFollowing ? 2 : 0, `${isNowFollowing ? "Following" : "Unfollowed"} ${leader.username} on VeRdex`);
  }

  // ── Goal handler ────────────────────────────────────────────────────────────
  function handleGoalCreate(data: Omit<VerdexGoal, "id" | "createdAt" | "yesPool" | "noPool" | "status">) {
    const goal: VerdexGoal = {
      ...data,
      id: `verdex-goal-${Date.now()}`,
      createdAt: new Date().toISOString(),
      yesPool: data.stakeWld,
      noPool: 0,
      status: "active",
    };
    openPayment({
      title: `Stake ${data.stakeWld} WLD on your goal`,
      amount: data.stakeWld.toFixed(2),
      detail: `VeRdex Goal: "${data.title}"`,
      feature: "tip-verdex",
      allowCustomAmount: false,
      success: "Goal created! Your friends can now back you or bet against you.",
      onConfirmed: async (_amt, _txRef) => {
        setGoals((prev) => [goal, ...prev]);
        setGoalSheet(false);
        earnPoints(10, `VeRdex goal created: "${data.title}"`);
        recordHistory({ title: "VeRdex goal created", detail: `Staked ${data.stakeWld} WLD on: "${data.title}"`, kind: "payment" });
      },
    });
    setGoalSheet(false);
  }

  function markGoalComplete(goalId: string) {
    setGoals((prev) => prev.map((g) => g.id === goalId ? { ...g, status: "completed" } : g));
    earnPoints(20, "VeRdex goal completed!");
    recordHistory({ title: "VeRdex goal completed", detail: "Goal marked as completed. Awaiting community verification.", kind: "profile" });
  }

  function cancelGoal(goalId: string) {
    setGoals((prev) => prev.map((g) => g.id === goalId ? { ...g, status: "cancelled" } : g));
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="verdex-screen" ref={scrollRef}>
      {/* Header */}
      <header className="verdex-header">
        <div className="verdex-header-top">
          {/* Brand mark */}
          <div className="verdex-brand">
            <div className="verdex-brand-icon"><Zap size={22} /></div>
            <div>
              <strong>VeRdex</strong>
              <span>Human Prediction Network</span>
            </div>
          </div>
          {/* Profile trigger — per docs: display username, not address */}
          {humanIdentity && (
            <ProfileTrigger
              user={humanIdentity}
              bets={bets}
              onClick={() => setProfileOpen(true)}
            />
          )}
        </div>
        <StatsBar stats={stats} />
      </header>

      {/* Sub-tabs */}
      <nav className="verdex-tabs" aria-label="VeRdex sections">
        {(["markets", "mybets", "clash", "leagues"] as VerdexTab[]).map((t) => (
          <button
            key={t}
            className={`verdex-tab-btn${verdexTab === t ? " active" : ""}`}
            onClick={() => setVerdexTab(t)}
            type="button"
          >
            {t === "markets" && <TrendingUp size={14} />}
            {t === "mybets"  && <Copy size={14} />}
            {t === "clash"   && <Swords size={14} />}
            {t === "leagues" && <Trophy size={14} />}
            {t === "mybets" ? "My Bets" : t === "clash" ? "Clash" : t.charAt(0).toUpperCase() + t.slice(1)}
            {/* Badge: unsettled bets count */}
            {t === "mybets" && bets.filter((b) => !b.settled).length > 0 && (
              <span className="verdex-tab-dot" style={{ background: "var(--verdex-yes)" }} />
            )}
            {t === "clash" && clashes.filter((c) => c.status === "pending").length > 0 && (
              <span className="verdex-tab-dot" />
            )}
          </button>
        ))}
      </nav>

      {/* ── MARKETS TAB ── */}
      {verdexTab === "markets" && (
        <div className="verdex-content">
          {/* Category filter */}
          <div className="verdex-cat-scroll">
            {(["all", "micro", "crypto", "sports", "world", "culture"] as VerdexCategory[]).map((cat) => (
              <CategoryPill key={cat} cat={cat} active={category === cat} onClick={() => setCategory(cat)} />
            ))}
          </div>

          {/* ⚡ Flash ticker — live micro markets */}
          {flashMarkets.length > 0 && category !== "micro" && (
            <div className="verdex-flash-strip">
              <span className="verdex-flash-label">⚡ FLASH</span>
              <div className="verdex-flash-scroll">
                {flashMarkets.map((fm) => (
                  <button
                    key={fm.id}
                    className="verdex-flash-chip"
                    type="button"
                    onClick={() => setCategory("micro")}
                  >
                    <span>{fm.title.length > 42 ? fm.title.slice(0, 42) + "…" : fm.title}</span>
                    <span className="verdex-flash-timer"><CountdownChip closesAt={fm.closesAt} /></span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Market hero (featured) */}
          {category === "all" && (
            <div className="verdex-hero-banner">
              <div className="verdex-hero-inner">
                <span className="verdex-hero-kicker">🌍 Live right now · {localMarkets.filter((m) => m.status === "open").length} open markets</span>
                <strong>The world is predicting. Are you?</strong>
                <p>Every forecaster is a verified human. No bots. No manipulation. Pure signal.</p>
              </div>
            </div>
          )}

          {/* Market list */}
          <div className="verdex-market-list">
            {sorted.length === 0 && (
              <div className="verdex-empty">No open {category} markets right now. Check back soon.</div>
            )}
            {sorted.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                myBet={bets.find((b) => b.marketId === market.id && b.confirmed)}
                onBet={(m, pos) => setBetSheet({ market: m, position: pos })}
                onClash={(m) => setClashSheet(m)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── MY BETS TAB ── */}
      {verdexTab === "mybets" && (
        <div className="verdex-content">
          <div className="verdex-mybets-header">
            <h3>Your Predictions</h3>
            <span>{bets.length} total · {bets.filter(b => !b.settled).length} open · {bets.filter(b => b.settled && (b.payout ?? 0) > b.amountWld).length} won</span>
          </div>

          {/* Real WLD treasury winnings — claim instantly to World App wallet */}
          <WinningsPanel wallet={humanIdentity?.wallet ?? null} />

          {bets.length === 0 ? (
            <div className="verdex-empty" style={{ marginTop: 32 }}>
              <p style={{ fontSize: "2rem" }}>🔮</p>
              <p>No bets yet. Find a market and place your first prediction!</p>
              <button className="verdex-cta-btn" onClick={() => setVerdexTab("markets")} type="button">
                Browse Markets
              </button>
            </div>
          ) : (
            <div className="verdex-mybets-list">
              {[...bets].reverse().map((bet) => {
                const refunded = Boolean(bet.settled && bet.payout != null && Math.abs(bet.payout - bet.amountWld) < 1e-9);
                const won  = bet.settled && !refunded && (bet.payout ?? 0) > bet.amountWld;
                const lost = bet.settled && !refunded && !won;
                const open = !bet.settled;
                const profit = won ? +((bet.payout ?? 0) - bet.amountWld).toFixed(4) : 0;
                // Find the market in current list
                const market = localMarkets.find(m => m.id === bet.marketId);
                return (
                  <div key={bet.id} className={`verdex-mybet-card ${won ? "won" : lost ? "lost" : "open"}`}>
                    {/* Status stripe */}
                    <div className="verdex-mybet-stripe" />

                    <div className="verdex-mybet-top">
                      <span className={`verdex-mybet-status ${won ? "won" : refunded ? "open" : lost ? "lost" : "open"}`}>
                        {won ? "✓ Won" : refunded ? "↩ Refunded" : lost ? "✗ Lost" : "⏳ Open"}
                      </span>
                      <span className="verdex-mybet-pos">{bet.position.toUpperCase()}</span>
                    </div>

                    <p className="verdex-mybet-title">{bet.marketTitle}</p>

                    <div className="verdex-mybet-amounts">
                      <div className="verdex-mybet-staked">
                        <span>Staked</span>
                        <strong>{bet.amountWld} WLD</strong>
                      </div>
                      {won ? (
                        <div className="verdex-mybet-payout won">
                          <span>Payout</span>
                          <strong>+{bet.payout?.toFixed(4)} WLD</strong>
                        </div>
                      ) : refunded ? (
                        <div className="verdex-mybet-payout potential">
                          <span>Refunded</span>
                          <strong>↩ {bet.amountWld} WLD</strong>
                        </div>
                      ) : lost ? (
                        <div className="verdex-mybet-payout lost">
                          <span>Result</span>
                          <strong>−{bet.amountWld} WLD</strong>
                        </div>
                      ) : market ? (
                        <div className="verdex-mybet-payout potential">
                          <span>If correct</span>
                          <strong>≈{calcPotentialPayout(bet.amountWld, bet.position, market.yesPool, market.noPool).toFixed(4)} WLD</strong>
                        </div>
                      ) : null}
                    </div>

                    {/* Show current odds for open bets */}
                    {open && market && (
                      <div className="verdex-mybet-odds">
                        <div className="verdex-pool-bar-wrap" style={{ marginBottom: 0 }}>
                          <div className="verdex-pool-bar">
                            <div className="verdex-pool-bar-yes" style={{ width: `${calcYesPct(market.yesPool, market.noPool)}%` }} />
                          </div>
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.72rem", color:"var(--verdex-muted)", marginTop:4 }}>
                          <span>YES {calcYesPct(market.yesPool, market.noPool)}%</span>
                          <CountdownChip closesAt={market.closesAt} />
                          <span>NO {100 - calcYesPct(market.yesPool, market.noPool)}%</span>
                        </div>
                      </div>
                    )}

                    {won && (
                      <div className="verdex-mybet-note won">
                        🎉 Winning! Claim your WLD above or it auto-pays to your wallet at distribution.
                      </div>
                    )}
                    {refunded && (
                      <div className="verdex-mybet-note won">
                        ↩ Market voided — your full stake was returned to your wallet.
                      </div>
                    )}
                    {lost && (
                      <div className="verdex-mybet-note lost">
                        Your {bet.amountWld} WLD went to the winners' pool.
                      </div>
                    )}

                    <span className="verdex-mybet-date">{new Date(bet.placedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Fund flow explanation */}
          <div className="verdex-mybets-explainer">
            <h4>💡 How funds work</h4>
            <div className="verdex-mybets-flow">
              <div className="verdex-flow-step">
                <span className="verdex-flow-icon">💸</span>
                <div><strong>You bet</strong><span>WLD goes to the market pool via World App</span></div>
              </div>
              <div className="verdex-flow-arrow">↓</div>
              <div className="verdex-flow-step">
                <span className="verdex-flow-icon">🔒</span>
                <div><strong>Market closes</strong><span>No more bets — result is awaited</span></div>
              </div>
              <div className="verdex-flow-arrow">↓</div>
              <div className="verdex-flow-step won">
                <span className="verdex-flow-icon">🏆</span>
                <div><strong>Correct prediction</strong><span>Winning forecasters share the losers' pool pro-rata</span></div>
              </div>
              <div className="verdex-flow-step lost">
                <span className="verdex-flow-icon">❌</span>
                <div><strong>Wrong prediction</strong><span>Your stake funds the winners' payout</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CLASH TAB ── */}
      {verdexTab === "clash" && (
        <div className="verdex-content">
          <div className="verdex-clash-hero">
            <Swords size={32} />
            <strong>1v1 Clash</strong>
            <p>Challenge any human to a direct duel. Match your WLD stake. Winner takes 90%.</p>
          </div>

          {pendingShareClash && (
            <div className="verdex-share-clash-card">
              <div className="verdex-share-clash-top">
                <Swords size={16} />
                <strong>Clash created! Share the link.</strong>
              </div>
              <p className="verdex-share-clash-market">{pendingShareClash.marketTitle}</p>
              <div className="verdex-share-clash-info">
                <span>You bet <strong>{pendingShareClash.creatorPosition.toUpperCase()}</strong></span>
                <span>Stake: <strong>{pendingShareClash.stakeWld} WLD</strong></span>
                <span>Expires in 24h</span>
              </div>
              <div className="verdex-share-clash-row">
                <button
                  className="verdex-share-clash-btn"
                  onClick={async () => {
                    const { worldLink, webLink } = getClashShareUrl(pendingShareClash.id);
                    try {
                      const { shareWithWorld } = await import("@/lib/world");
                      await shareWithWorld({ title: "⚔️ VeRdex Clash challenge", text: `${humanIdentity?.username ?? "A human"} is challenging you to a prediction duel! Stake ${pendingShareClash.stakeWld} WLD on "${pendingShareClash.marketTitle}". Winner takes 90%.`, url: worldLink });
                    } catch {
                      if (navigator.clipboard) await navigator.clipboard.writeText(webLink);
                    }
                    earnPoints(2, "VeRdex Clash link shared");
                  }}
                  type="button"
                >
                  <Copy size={14} /> Copy challenge link
                </button>
                <button className="verdex-goal-cancel-btn" onClick={() => setPendingShareClash(null)} type="button">Dismiss</button>
              </div>
            </div>
          )}

          {clashes.length === 0 && !pendingShareClash && (
            <div className="verdex-empty">
              No clashes yet. Challenge someone from any market card.
            </div>
          )}

          <div className="verdex-clash-list">
            {clashes.map((clash) => {
              const myNullifier = humanIdentity?.wallet ?? "";
              const { expired } = formatCountdown(clash.expiresAt);
              return (
                <div key={clash.id} className={`verdex-clash-card ${clash.status}`}>
                  <div className="verdex-clash-card-top">
                    <span className={`verdex-goal-status-badge ${clash.status === "active" ? "active" : clash.status === "resolved" ? (clash.winnerNullifier === myNullifier ? "completed" : "failed") : clash.status === "expired" ? "cancelled" : "active"}`}>
                      {clashStatusLabel(clash, myNullifier)}
                    </span>
                    {clash.status === "pending" && !expired && <span className="verdex-chip verdex-chip-time">{formatCountdown(clash.expiresAt).label} left</span>}
                  </div>
                  <strong className="verdex-goal-title">{clash.marketTitle}</strong>
                  <div className="verdex-clash-card-detail">
                    <span>vs <strong>{clashOpponent(clash, myNullifier)}</strong></span>
                    <span>{clash.stakeWld} WLD each</span>
                    <span>You bet <strong>{(clash.creatorNullifier === myNullifier ? clash.creatorPosition : clash.challengerPosition).toUpperCase()}</strong></span>
                  </div>
                  {clash.status === "resolved" && clash.payoutWld && clash.winnerNullifier === myNullifier && (
                    <div className="verdex-my-bet-badge yes">🏆 Won {clash.payoutWld} WLD</div>
                  )}
                  {clash.status === "pending" && (
                    <button
                      className="verdex-share-clash-btn"
                      onClick={async () => {
                        const { worldLink, webLink } = getClashShareUrl(clash.id);
                        try {
                          const { shareWithWorld } = await import("@/lib/world");
                          await shareWithWorld({ title: "⚔️ VeRdex Clash", text: `Challenge: ${clash.marketTitle}`, url: worldLink });
                        } catch {
                          if (navigator.clipboard) await navigator.clipboard.writeText(webLink);
                        }
                      }}
                      type="button"
                    >
                      <Copy size={13} /> Share link
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LEAGUES TAB ── */}
      {verdexTab === "leagues" && (
        <div className="verdex-content">
          {/* Your score card */}
          {bets.length > 0 && (
            <div className="verdex-your-score">
              <div className="verdex-your-score-top">
                <Users size={18} />
                <strong>Your Forecast Record</strong>
              </div>
              <div className="verdex-your-score-grid">
                <div><b>{stats.totalBets}</b><span>Total Bets</span></div>
                <div><b>{stats.winRate}%</b><span>Win Rate</span></div>
                <div><b>{stats.currentStreak > 0 ? `🔥 ${stats.currentStreak}` : "—"}</b><span>Streak</span></div>
                <div><b>{stats.totalWon > 0 ? `${stats.totalWon}` : "—"}</b><span>WLD Won</span></div>
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="verdex-section-head">
            <Trophy size={16} />
            <strong>Top Forecasters — All Time</strong>
          </div>

          {copyFollows.length > 0 && (
            <div className="verdex-copy-feed">
              <div className="verdex-section-head" style={{ marginBottom: 8 }}>
                <Users size={15} />
                <strong>Following — Auto-copy suggestions</strong>
              </div>
              {copyFollows.map((follow) => (
                <div key={follow.leaderNullifier} className="verdex-copy-follow-row">
                  <div className="verdex-leader-avatar" style={{ width: 34, height: 34, fontSize: "0.82rem" }}>{follow.leaderUsername.replace(/^@/, "").charAt(0).toUpperCase()}</div>
                  <div className="verdex-leader-info">
                    <strong>{follow.leaderUsername}</strong>
                    <span>Copy at {Math.round(follow.copyFraction * 100)}% of their stake</span>
                  </div>
                  <button
                    className="verdex-unfollow-btn"
                    onClick={() => handleCopyToggle({ nullifier: follow.leaderNullifier, username: follow.leaderUsername })}
                    type="button"
                  >
                    <UserMinus size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {leaderboard.length === 0 && (
            <div className="verdex-empty" style={{ marginTop: 24 }}>
              <p style={{ fontSize: "2rem" }}>🏆</p>
              <p>No ranked forecasters yet. Win a market and your name opens the board.</p>
            </div>
          )}

          <div className="verdex-leaderboard">
            {leaderboard.map((entry) => {
              const following = isFollowing(entry.username);
              return (
                <div key={entry.rank} className="verdex-leader-row">
                  <div className="verdex-leader-rank">
                    {entry.badge ? <span>{entry.badge}</span> : <span>#{entry.rank}</span>}
                  </div>
                  <div className="verdex-leader-avatar">{entry.initial}</div>
                  <div className="verdex-leader-info">
                    <strong>{entry.username}</strong>
                    <span>{entry.specialty} · {entry.totalBets} bets · 🔥{entry.streak}</span>
                  </div>
                  <div className="verdex-leader-right">
                    <b>{entry.winRate}%</b>
                    <small>+{entry.totalWonWld.toLocaleString()} WLD</small>
                    <button
                      className={`verdex-follow-btn${following ? " following" : ""}`}
                      onClick={() => handleCopyToggle({ nullifier: entry.username, username: entry.username })}
                      type="button"
                      title={following ? "Unfollow" : "Copy their bets"}
                    >
                      {following ? <UserMinus size={12} /> : <UserPlus size={12} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="verdex-league-cta">
            <div>
              <Zap size={16} />
              <strong>Leagues coming soon</strong>
              <p>Form a team of 5 verified humans. Compete weekly. Top teams earn WLD prize pools.</p>
            </div>
            <button className="verdex-cta-btn" type="button" onClick={() => {
              earnPoints(2, "Joined VeRdex Leagues waitlist");
              recordHistory({ title: "VeRdex Leagues waitlist", detail: "Joined the VeRdex team forecasting waitlist.", kind: "profile" });
            }}>
              Join Waitlist <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── GOALS TAB ── */}
      {verdexTab === "goals" && (
        <div className="verdex-content">
          <div className="verdex-goals-hero">
            <Target size={32} />
            <strong>Stake your goals. Prove yourself.</strong>
            <p>Set a personal goal, stake WLD, and let your verified human network back you — or bet you will fail.</p>
          </div>

          <button
            className="verdex-new-goal-btn"
            onClick={() => {
              if (!humanIdentity) return;
              setGoalSheet(true);
            }}
            type="button"
          >
            <Target size={16} />
            {humanIdentity ? "Create New Goal" : "Verify with World ID first"}
          </button>

          {goals.length === 0 && (
            <div className="verdex-empty" style={{ marginTop: 24 }}>
              No active goals yet. Create one and challenge your network to back you.
            </div>
          )}

          {goals.length > 0 && (
            <div className="verdex-goal-list">
              {goals.map((goal) => {
                const { label } = formatCountdown(goal.deadline);
                const total = goal.yesPool + goal.noPool;
                const yesPct = total > 0 ? Math.round((goal.yesPool / total) * 100) : 100;
                return (
                  <div key={goal.id} className={`verdex-goal-card ${goal.status}`}>
                    <div className="verdex-goal-card-top">
                      <span className={`verdex-goal-status-badge ${goal.status}`}>
                        {goal.status === "active" ? "🔥 Active" : goal.status === "completed" ? "✅ Done" : goal.status === "failed" ? "❌ Failed" : "🚫 Cancelled"}
                      </span>
                      {goal.status === "active" && <span className="verdex-chip verdex-chip-time">{label} left</span>}
                    </div>
                    <strong className="verdex-goal-title">{goal.title}</strong>
                    {goal.description && <p className="verdex-goal-desc">{goal.description}</p>}

                    <div className="verdex-pool-bar-wrap" style={{ marginTop: 8 }}>
                      <div className="verdex-pool-bar">
                        <div className="verdex-pool-bar-yes" style={{ width: `${yesPct}%` }} />
                      </div>
                      <div className="verdex-pool-labels">
                        <span className="verdex-yes-label">Backers {yesPct}%</span>
                        <span className="verdex-no-label">Doubters {100 - yesPct}%</span>
                      </div>
                    </div>

                    <div className="verdex-market-meta">
                      <span>💰 {goal.stakeWld} WLD staked</span>
                      <span>🏦 {formatPoolSize(total)} total pool</span>
                    </div>

                    {goal.status === "active" && (
                      <div className="verdex-goal-actions">
                        <button className="verdex-goal-complete-btn" onClick={() => markGoalComplete(goal.id)} type="button">
                          ✓ Mark Complete
                        </button>
                        <button className="verdex-goal-cancel-btn" onClick={() => cancelGoal(goal.id)} type="button">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Clash sheet */}
      {clashSheet && (
        <ClashSheet
          market={clashSheet}
          onClose={() => setClashSheet(null)}
          onConfirm={handleClashCreate}
        />
      )}

      {/* Clash accept modal */}
      {clashAccept && (
        <ClashAcceptModal
          clash={clashAccept}
          myNullifier={humanIdentity?.wallet ?? ""}
          onClose={() => setClashAccept(null)}
          onAccept={handleClashAccept}
        />
      )}

      {/* Bet sheet */}
      {betSheet && (
        <BetSheet
          market={betSheet.market}
          initialPosition={betSheet.position}
          onClose={() => setBetSheet(null)}
          onConfirm={handleBetConfirm}
        />
      )}

      {/* Goal sheet */}
      {goalSheet && (
        <GoalSheet onClose={() => setGoalSheet(false)} onSave={handleGoalCreate} />
      )}

      {/* Profile sheet — accessed from header avatar */}
      {profileOpen && humanIdentity && (
        <ProfileSheet
          user={humanIdentity}
          bets={bets}
          follows={copyFollows}
          leaderboard={leaderboard}
          theme={theme}
          onThemeToggle={onThemeToggle}
          onUnfollow={(nullifier) => {
            setCopyFollows((prev) => {
              const next = prev.filter((f) => f.leaderNullifier !== nullifier);
              return next;
            });
          }}
          onClose={() => setProfileOpen(false)}
          onSignOut={onSignOut}
        />
      )}
    </div>
  );
}
