"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, Copy, Swords, Target, Trophy, TrendingUp, UserMinus, UserPlus, Users, X, Zap } from "lucide-react";
import { seedLeaderboard, seedMarkets } from "@/lib/pulse/data";
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
  loadPulseBets,
  loadPulseGoals,
  savePulseBets,
  savePulseGoals,
} from "@/lib/pulse/utils";
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
} from "@/lib/pulse/clash";
import type { PulseBet, PulseCategory, PulseClash, PulseCopyFollow, PulseGoal, PulseMarket, PulseTab } from "@/types/pulse";
import type { EarnPoints, OpenPayment } from "@/types/ui";
import type { HistoryRecord } from "@/types/reputation";
import type { VerifiedHuman } from "@/types/user";

// ── Props ─────────────────────────────────────────────────────────────────────

type PulseViewProps = {
  earnPoints: EarnPoints;
  humanIdentity: VerifiedHuman | null;
  openPayment: OpenPayment;
  recordHistory: (record: Omit<HistoryRecord, "id" | "time">) => void;
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
    <span className={`pulse-chip pulse-chip-time${urgent ? " urgent" : ""}${expired ? " expired" : ""}`}>
      {expired ? "🔒 Closed" : `⏱ ${label}`}
    </span>
  );
}

function PoolBar({ yesPool, noPool }: { yesPool: number; noPool: number }) {
  const yesPct = calcYesPct(yesPool, noPool);
  return (
    <div className="pulse-pool-bar-wrap">
      <div className="pulse-pool-bar">
        <div className="pulse-pool-bar-yes" style={{ width: `${yesPct}%` }} />
      </div>
      <div className="pulse-pool-labels">
        <span className="pulse-yes-label">YES {yesPct}%</span>
        <span className="pulse-no-label">NO {100 - yesPct}%</span>
      </div>
    </div>
  );
}

function CategoryPill({
  cat,
  active,
  onClick,
}: {
  cat: PulseCategory;
  active: boolean;
  onClick: () => void;
}) {
  const meta = categoryMeta[cat];
  return (
    <button
      className={`pulse-cat-pill${active ? " active" : ""}`}
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
  market: PulseMarket;
  myBet: PulseBet | undefined;
  onBet: (market: PulseMarket, position: "yes" | "no") => void;
  onClash: (market: PulseMarket) => void;
}) {
  const { expired } = formatCountdown(market.closesAt);
  const meta = categoryMeta[market.category];
  const total = market.yesPool + market.noPool;

  return (
    <article className={`pulse-market-card${market.featured ? " featured" : ""}`}>
      {market.featured && <div className="pulse-featured-tag">⭐ Featured</div>}
      <div className="pulse-market-card-top">
        <span className="pulse-cat-tag" style={{ color: meta.color, borderColor: `${meta.color}44`, background: `${meta.color}18` }}>
          {meta.emoji} {meta.label.toUpperCase()}
        </span>
        <CountdownChip closesAt={market.closesAt} />
        {market.aiGenerated && <span className="pulse-ai-tag">🤖 AI</span>}
      </div>

      <h3 className="pulse-market-title">{market.title}</h3>

      <PoolBar yesPool={market.yesPool} noPool={market.noPool} />

      <div className="pulse-market-meta">
        <span>🏦 {formatPoolSize(total)}</span>
        <span>👥 {market.totalBettors?.toLocaleString() ?? "—"} humans</span>
      </div>

      {myBet ? (
        <div className={`pulse-my-bet-badge ${myBet.position}`}>
          ✓ You bet {myBet.amountWld} WLD on <strong>{myBet.position.toUpperCase()}</strong>
        </div>
      ) : expired ? (
        <div className="pulse-market-closed-note">Market closed — awaiting resolution</div>
      ) : (
        <>
          <div className="pulse-bet-row">
            <button className="pulse-bet-yes" onClick={() => onBet(market, "yes")} type="button">
              BET YES {calcOdds("yes", market.yesPool, market.noPool)}
            </button>
            <button className="pulse-bet-no" onClick={() => onBet(market, "no")} type="button">
              BET NO {calcOdds("no", market.yesPool, market.noPool)}
            </button>
          </div>
          <button className="pulse-clash-trigger" onClick={() => onClash(market)} type="button">
            <Swords size={13} /> Challenge a human 1v1
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
  market: PulseMarket;
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
    <div className="pulse-sheet-backdrop" onClick={onClose} role="presentation">
      <div className="pulse-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Place bet">
        <div className="pulse-sheet-handle" />

        <div className="pulse-sheet-header">
          <div>
            <span className="pulse-sheet-kicker">Place your forecast</span>
            <strong className="pulse-sheet-title">{market.title}</strong>
          </div>
          <button className="pulse-sheet-close" onClick={onClose} type="button" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Position toggle */}
        <div className="pulse-position-toggle">
          <button
            className={`pulse-pos-yes${position === "yes" ? " active" : ""}`}
            onClick={() => setPosition("yes")}
            type="button"
          >
            <span>YES</span>
            <small>{calcOdds("yes", market.yesPool, market.noPool)}</small>
          </button>
          <button
            className={`pulse-pos-no${position === "no" ? " active" : ""}`}
            onClick={() => setPosition("no")}
            type="button"
          >
            <span>NO</span>
            <small>{calcOdds("no", market.yesPool, market.noPool)}</small>
          </button>
        </div>

        {/* Amount chips */}
        <div className="pulse-amount-label">Stake amount (WLD)</div>
        <div className="pulse-amount-chips">
          {BET_CHIPS.map((chip) => (
            <button
              key={chip}
              className={`pulse-amount-chip${amount === chip && !custom ? " active" : ""}`}
              onClick={() => { setAmount(chip); setCustom(""); }}
              type="button"
            >
              {chip}
            </button>
          ))}
          <input
            className="pulse-amount-custom"
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
        <div className="pulse-payout-box">
          <div className="pulse-payout-row">
            <span>Your stake</span>
            <strong>{finalAmount > 0 ? `${finalAmount} WLD` : "—"}</strong>
          </div>
          <div className="pulse-payout-row">
            <span>Potential payout</span>
            <strong className="pulse-payout-highlight">{finalAmount > 0 ? `${payout} WLD` : "—"}</strong>
          </div>
          <div className="pulse-payout-row">
            <span>Potential profit</span>
            <strong className={profit > 0 ? "pulse-profit-pos" : "pulse-profit-neg"}>
              {finalAmount > 0 ? `+${profit} WLD` : "—"}
            </strong>
          </div>
        </div>

        <button
          className={`pulse-confirm-btn ${position}`}
          disabled={finalAmount <= 0 || finalAmount > 100}
          onClick={() => onConfirm(position, finalAmount)}
          type="button"
        >
          <Zap size={16} />
          Place {finalAmount > 0 ? `${finalAmount} WLD` : ""} on {position.toUpperCase()}
        </button>

        <p className="pulse-sheet-note">
          Platform takes 0.3% fee. Payout depends on final pool size at close.
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
  market: PulseMarket;
  onClose: () => void;
  onConfirm: (position: "yes" | "no", amount: number) => void;
}) {
  const [position, setPosition] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState(1);

  return (
    <div className="pulse-sheet-backdrop" onClick={onClose} role="presentation">
      <div className="pulse-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Create clash">
        <div className="pulse-sheet-handle" />
        <div className="pulse-sheet-header">
          <div>
            <span className="pulse-sheet-kicker">⚔️ 1v1 Clash — 10% rake</span>
            <strong className="pulse-sheet-title">{market.title}</strong>
          </div>
          <button className="pulse-sheet-close" onClick={onClose} type="button" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="pulse-clash-how">
          <Swords size={14} />
          <span>Stake WLD on your position. Share the link. If a human accepts the opposite side, the winner takes 90%.</span>
        </div>

        <div className="pulse-position-toggle">
          <button className={`pulse-pos-yes${position === "yes" ? " active" : ""}`} onClick={() => setPosition("yes")} type="button">
            <span>YES</span><small>You think it happens</small>
          </button>
          <button className={`pulse-pos-no${position === "no" ? " active" : ""}`} onClick={() => setPosition("no")} type="button">
            <span>NO</span><small>You think it does not</small>
          </button>
        </div>

        <div className="pulse-amount-label">Stake (WLD) — challenger must match</div>
        <div className="pulse-amount-chips">
          {[0.5, 1, 2, 5].map((chip) => (
            <button key={chip} className={`pulse-amount-chip${amount === chip ? " active" : ""}`} onClick={() => setAmount(chip)} type="button">{chip}</button>
          ))}
        </div>

        <div className="pulse-payout-box">
          <div className="pulse-payout-row"><span>Your stake</span><strong>{amount} WLD</strong></div>
          <div className="pulse-payout-row"><span>Challenger stakes</span><strong>{amount} WLD</strong></div>
          <div className="pulse-payout-row"><span>Winner takes</span><strong className="pulse-payout-highlight">{Math.round(amount * 2 * 0.9 * 100) / 100} WLD</strong></div>
          <div className="pulse-payout-row"><span>Platform fee</span><strong>{Math.round(amount * 2 * 0.1 * 100) / 100} WLD (10%)</strong></div>
        </div>

        <button className={`pulse-confirm-btn ${position}`} onClick={() => onConfirm(position, amount)} type="button">
          <Swords size={16} /> Create Clash — Stake {amount} WLD
        </button>
        <p className="pulse-sheet-note">After payment, you get a shareable link. Clash expires in 24h if unchallenged.</p>
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
  clash: PulseClash;
  myNullifier: string;
  onClose: () => void;
  onAccept: (clash: PulseClash) => void;
}) {
  const alreadyAccepted = clash.challengerNullifier === myNullifier;
  const isOwner = clash.creatorNullifier === myNullifier;

  return (
    <div className="pulse-sheet-backdrop" onClick={onClose} role="presentation">
      <div className="pulse-sheet pulse-clash-accept" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Clash challenge">
        <div className="pulse-sheet-handle" />
        <div className="pulse-clash-accept-hero">
          <Swords size={36} />
          <strong>{isOwner ? "Your clash is pending" : "⚔️ You have been challenged!"}</strong>
        </div>

        <div className="pulse-clash-accept-market">
          <span className="pulse-sheet-kicker">The market</span>
          <p>{clash.marketTitle}</p>
        </div>

        <div className="pulse-clash-accept-sides">
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

        <div className="pulse-payout-box">
          <div className="pulse-payout-row"><span>Each stakes</span><strong>{clash.stakeWld} WLD</strong></div>
          <div className="pulse-payout-row"><span>Winner takes</span><strong className="pulse-payout-highlight">{Math.round(clash.stakeWld * 2 * 0.9 * 100) / 100} WLD</strong></div>
        </div>

        {isOwner || alreadyAccepted ? (
          <div className="pulse-clash-accepted-note">
            {alreadyAccepted ? "✅ You already accepted this clash." : "⏳ Waiting for a challenger to accept."}
          </div>
        ) : (
          <button className="pulse-confirm-btn no" onClick={() => onAccept(clash)} type="button">
            <Swords size={16} /> Accept Challenge — Stake {clash.stakeWld} WLD
          </button>
        )}
        <button className="pulse-goal-cancel-btn" onClick={onClose} style={{ width: "100%" }} type="button">Close</button>
      </div>
    </div>
  );
}

// ── Goal Sheet ────────────────────────────────────────────────────────────────

function GoalSheet({ onClose, onSave }: { onClose: () => void; onSave: (g: Omit<PulseGoal, "id" | "createdAt" | "yesPool" | "noPool" | "status">) => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [stake, setStake] = useState(1);
  const [days, setDays] = useState(7);

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + days);

  return (
    <div className="pulse-sheet-backdrop" onClick={onClose} role="presentation">
      <div className="pulse-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="New goal">
        <div className="pulse-sheet-handle" />
        <div className="pulse-sheet-header">
          <div>
            <span className="pulse-sheet-kicker">New personal goal</span>
            <strong className="pulse-sheet-title">Stake your reputation on it</strong>
          </div>
          <button className="pulse-sheet-close" onClick={onClose} type="button" aria-label="Close"><X size={18} /></button>
        </div>

        <label className="pulse-field-label">
          What will you achieve?
          <input
            className="pulse-field-input"
            maxLength={100}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. I will run 5km three times this week"
            type="text"
            value={title}
          />
        </label>

        <label className="pulse-field-label">
          Details (optional)
          <input
            className="pulse-field-input"
            maxLength={200}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="How will this be verified?"
            type="text"
            value={desc}
          />
        </label>

        <div className="pulse-goal-row">
          <label className="pulse-field-label" style={{ flex: 1 }}>
            Stake (WLD)
            <select className="pulse-field-input" onChange={(e) => setStake(Number(e.target.value))} value={stake}>
              {[0.5, 1, 2, 5].map((v) => <option key={v} value={v}>{v} WLD</option>)}
            </select>
          </label>
          <label className="pulse-field-label" style={{ flex: 1 }}>
            Deadline
            <select className="pulse-field-input" onChange={(e) => setDays(Number(e.target.value))} value={days}>
              {[3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} days</option>)}
            </select>
          </label>
        </div>

        <div className="pulse-goal-preview">
          <Zap size={14} />
          <span>Friends can back you (YES) or doubt you (NO). Backers split your stake if you fail; you keep it if you succeed.</span>
        </div>

        <button
          className="pulse-confirm-btn yes"
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
    <div className="pulse-stats-bar">
      <div className="pulse-stat">
        <strong>{stats.totalBets}</strong>
        <span>Bets</span>
      </div>
      <div className="pulse-stat">
        <strong>{stats.winRate}%</strong>
        <span>Win Rate</span>
      </div>
      <div className="pulse-stat">
        <strong>{stats.totalWon > 0 ? `${stats.totalWon}` : "—"}</strong>
        <span>WLD Won</span>
      </div>
      <div className="pulse-stat">
        <strong>{stats.currentStreak > 0 ? `🔥${stats.currentStreak}` : "—"}</strong>
        <span>Streak</span>
      </div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function PulseView({ earnPoints, humanIdentity, openPayment, recordHistory }: PulseViewProps) {
  const [pulseTab, setPulseTab] = useState<PulseTab>("markets");
  const [category, setCategory] = useState<PulseCategory>("all");
  const [bets, setBets] = useState<PulseBet[]>(loadPulseBets);
  const [goals, setGoals] = useState<PulseGoal[]>(loadPulseGoals);
  const [clashes, setClashes] = useState<PulseClash[]>(loadLocalClashes);
  const [copyFollows, setCopyFollows] = useState<PulseCopyFollow[]>(loadCopyFollows);
  const [betSheet, setBetSheet] = useState<{ market: PulseMarket; position: "yes" | "no" } | null>(null);
  const [clashSheet, setClashSheet] = useState<PulseMarket | null>(null);
  const [clashAccept, setClashAccept] = useState<PulseClash | null>(null);
  const [pendingShareClash, setPendingShareClash] = useState<PulseClash | null>(null);
  const [goalSheet, setGoalSheet] = useState(false);
  const [localMarkets, setLocalMarkets] = useState<PulseMarket[]>(() => applyLocalPools(seedMarkets));
  const [leaderboard, setLeaderboard] = useState(seedLeaderboard);
  const stats = calcPlayerStats(bets);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Persist bets, goals, clashes
  useEffect(() => { savePulseBets(bets); }, [bets]);
  useEffect(() => { savePulseGoals(goals); }, [goals]);
  useEffect(() => { saveLocalClashes(clashes); }, [clashes]);

  // Deeplink: ?pulse_clash=CLASH_ID → show accept modal
  useEffect(() => {
    const clashId = readClashIdFromUrl();
    if (!clashId) return;
    fetch(`/api/pulse/clash/${clashId}`)
      .then((r) => r.json())
      .then((payload: { ok: boolean; clash?: PulseClash }) => {
        if (payload.ok && payload.clash) {
          setClashAccept(payload.clash);
          setPulseTab("clash");
        }
      })
      .catch(() => null);
  }, []);

  // ── Fetch markets from API ──────────────────────────────────────────────────
  const fetchMarkets = useCallback(async (cat: string) => {
    try {
      const res = await fetch(`/api/pulse/markets?category=${cat}`, { cache: "no-store" });
      const payload = await res.json() as { ok: boolean; markets?: PulseMarket[] };
      if (payload.ok && payload.markets?.length) {
        setLocalMarkets(applyLocalPools(payload.markets));
      }
    } catch {
      // keep seed data on network failure
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchMarkets(category); }, [category, fetchMarkets]);

  // ── Fetch leaderboard from API ──────────────────────────────────────────────
  useEffect(() => {
    if (pulseTab !== "leagues") return;
    fetch("/api/pulse/leaderboard", { cache: "no-store" })
      .then((r) => r.json())
      .then((payload: { ok: boolean; leaderboard?: typeof seedLeaderboard }) => {
        if (payload.ok && payload.leaderboard?.length) setLeaderboard(payload.leaderboard);
      })
      .catch(() => null);
  }, [pulseTab]);

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
      detail: `PULSE bet: "${market.title}"`,
      feature: "tip-pulse",
      allowCustomAmount: false,
      success: `${amount} WLD bet placed on ${position.toUpperCase()}! Awaiting resolution.`,
      onConfirmed: async () => {
        const betId = `pulse-bet-${Date.now()}`;
        const newBet: PulseBet = {
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
        // Persist bet to Supabase (fire-and-forget — local state is source of truth)
        fetch("/api/pulse/bet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: betId,
            marketId: market.id,
            worldNullifier: humanIdentity?.wallet ?? "preview",
            username: humanIdentity?.username ?? undefined,
            position,
            amountWld: amount,
            txReference: `pulse-${betId}`,
          }),
        }).catch(() => null);
        earnPoints(5, `PULSE bet placed: ${amount} WLD on ${position.toUpperCase()}`);
        recordHistory({ title: "PULSE bet placed", detail: `Bet ${amount} WLD on ${position.toUpperCase()}: "${market.title}"`, kind: "payment" });
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
      detail: `PULSE 1v1 Clash: "${market.title}"`,
      feature: "tip-pulse",
      allowCustomAmount: false,
      success: "Clash created! Share the link to find a challenger.",
      onConfirmed: async () => {
        const clashId = `clash-${Date.now()}`;
        const newClash: PulseClash = {
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
        setPulseTab("clash");

        fetch("/api/pulse/clash/create", {
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

        earnPoints(8, `PULSE Clash created: ${amount} WLD on ${position.toUpperCase()}`);
        recordHistory({ title: "PULSE Clash created", detail: `Created 1v1 Clash: ${amount} WLD on ${position.toUpperCase()} — "${market.title}"`, kind: "payment" });
      },
    });
  }

  function handleClashAccept(clash: PulseClash) {
    setClashAccept(null);
    openPayment({
      title: `Accept Clash: ${clash.stakeWld} WLD on ${clash.challengerPosition.toUpperCase()}`,
      amount: clash.stakeWld.toFixed(2),
      detail: `PULSE Clash: "${clash.marketTitle}"`,
      feature: "tip-pulse",
      allowCustomAmount: false,
      success: "Clash accepted! May the best forecaster win.",
      onConfirmed: async () => {
        const updated: PulseClash = { ...clash, challengerNullifier: humanIdentity?.wallet ?? "preview", challengerUsername: humanIdentity?.username ?? undefined, status: "active" };
        setClashes((prev) => {
          const existing = prev.find((c) => c.id === clash.id);
          if (existing) return prev.map((c) => c.id === clash.id ? updated : c);
          return [updated, ...prev];
        });
        upsertLocalClash(updated);

        fetch("/api/pulse/clash/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clashId: clash.id,
            challengerNullifier: humanIdentity?.wallet ?? "preview",
            challengerUsername: humanIdentity?.username ?? undefined,
            txRef: `accept-${clash.id}-${Date.now()}`,
          }),
        }).catch(() => null);

        earnPoints(5, `PULSE Clash accepted: ${clash.stakeWld} WLD`);
        recordHistory({ title: "PULSE Clash accepted", detail: `Accepted ${clash.stakeWld} WLD Clash on "${clash.marketTitle}"`, kind: "payment" });
      },
    });
  }

  function handleCopyToggle(leader: { nullifier: string; username: string }) {
    const isNowFollowing = toggleFollow(leader);
    setCopyFollows(loadCopyFollows());
    earnPoints(isNowFollowing ? 2 : 0, `${isNowFollowing ? "Following" : "Unfollowed"} ${leader.username} on PULSE`);
  }

  // ── Goal handler ────────────────────────────────────────────────────────────
  function handleGoalCreate(data: Omit<PulseGoal, "id" | "createdAt" | "yesPool" | "noPool" | "status">) {
    const goal: PulseGoal = {
      ...data,
      id: `pulse-goal-${Date.now()}`,
      createdAt: new Date().toISOString(),
      yesPool: data.stakeWld,
      noPool: 0,
      status: "active",
    };
    openPayment({
      title: `Stake ${data.stakeWld} WLD on your goal`,
      amount: data.stakeWld.toFixed(2),
      detail: `PULSE Goal: "${data.title}"`,
      feature: "tip-pulse",
      allowCustomAmount: false,
      success: "Goal created! Your friends can now back you or bet against you.",
      onConfirmed: async () => {
        setGoals((prev) => [goal, ...prev]);
        setGoalSheet(false);
        earnPoints(10, `PULSE goal created: "${data.title}"`);
        recordHistory({ title: "PULSE goal created", detail: `Staked ${data.stakeWld} WLD on: "${data.title}"`, kind: "payment" });
      },
    });
    setGoalSheet(false);
  }

  function markGoalComplete(goalId: string) {
    setGoals((prev) => prev.map((g) => g.id === goalId ? { ...g, status: "completed" } : g));
    earnPoints(20, "PULSE goal completed!");
    recordHistory({ title: "PULSE goal completed", detail: "Goal marked as completed. Awaiting community verification.", kind: "profile" });
  }

  function cancelGoal(goalId: string) {
    setGoals((prev) => prev.map((g) => g.id === goalId ? { ...g, status: "cancelled" } : g));
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="pulse-screen" ref={scrollRef}>
      {/* Header */}
      <header className="pulse-header">
        <div className="pulse-brand">
          <div className="pulse-brand-icon"><Zap size={22} /></div>
          <div>
            <strong>PULSE</strong>
            <span>Human Prediction Network</span>
          </div>
        </div>
        <StatsBar stats={stats} />
      </header>

      {/* Sub-tabs */}
      <nav className="pulse-tabs" aria-label="PULSE sections">
        {(["markets", "clash", "leagues", "goals"] as PulseTab[]).map((t) => (
          <button
            key={t}
            className={`pulse-tab-btn${pulseTab === t ? " active" : ""}`}
            onClick={() => setPulseTab(t)}
            type="button"
          >
            {t === "markets" && <TrendingUp size={14} />}
            {t === "clash" && <Swords size={14} />}
            {t === "leagues" && <Trophy size={14} />}
            {t === "goals" && <Target size={14} />}
            {t === "clash" ? "Clash" : t.charAt(0).toUpperCase() + t.slice(1)}
            {t === "clash" && clashes.filter((c) => c.status === "pending").length > 0 && (
              <span className="pulse-tab-dot" />
            )}
          </button>
        ))}
      </nav>

      {/* ── MARKETS TAB ── */}
      {pulseTab === "markets" && (
        <div className="pulse-content">
          {/* Category filter */}
          <div className="pulse-cat-scroll">
            {(["all", "micro", "crypto", "sports", "world", "culture"] as PulseCategory[]).map((cat) => (
              <CategoryPill key={cat} cat={cat} active={category === cat} onClick={() => setCategory(cat)} />
            ))}
          </div>

          {/* Market hero (featured) */}
          {category === "all" && (
            <div className="pulse-hero-banner">
              <div className="pulse-hero-inner">
                <span className="pulse-hero-kicker">🌍 Live right now · {localMarkets.filter((m) => m.status === "open").length} open markets</span>
                <strong>The world is predicting. Are you?</strong>
                <p>Every forecaster is a verified human. No bots. No manipulation. Pure signal.</p>
              </div>
            </div>
          )}

          {/* Market list */}
          <div className="pulse-market-list">
            {sorted.length === 0 && (
              <div className="pulse-empty">No open {category} markets right now. Check back soon.</div>
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

      {/* ── CLASH TAB ── */}
      {pulseTab === "clash" && (
        <div className="pulse-content">
          <div className="pulse-clash-hero">
            <Swords size={32} />
            <strong>1v1 Clash</strong>
            <p>Challenge any human to a direct duel. Match your WLD stake. Winner takes 90%.</p>
          </div>

          {pendingShareClash && (
            <div className="pulse-share-clash-card">
              <div className="pulse-share-clash-top">
                <Swords size={16} />
                <strong>Clash created! Share the link.</strong>
              </div>
              <p className="pulse-share-clash-market">{pendingShareClash.marketTitle}</p>
              <div className="pulse-share-clash-info">
                <span>You bet <strong>{pendingShareClash.creatorPosition.toUpperCase()}</strong></span>
                <span>Stake: <strong>{pendingShareClash.stakeWld} WLD</strong></span>
                <span>Expires in 24h</span>
              </div>
              <div className="pulse-share-clash-row">
                <button
                  className="pulse-share-clash-btn"
                  onClick={async () => {
                    const { worldLink, webLink } = getClashShareUrl(pendingShareClash.id);
                    try {
                      const { shareWithWorld } = await import("@/lib/world");
                      await shareWithWorld({ title: "⚔️ PULSE Clash challenge", text: `${humanIdentity?.username ?? "A human"} is challenging you to a prediction duel! Stake ${pendingShareClash.stakeWld} WLD on "${pendingShareClash.marketTitle}". Winner takes 90%.`, url: worldLink });
                    } catch {
                      if (navigator.clipboard) await navigator.clipboard.writeText(webLink);
                    }
                    earnPoints(2, "PULSE Clash link shared");
                  }}
                  type="button"
                >
                  <Copy size={14} /> Copy challenge link
                </button>
                <button className="pulse-goal-cancel-btn" onClick={() => setPendingShareClash(null)} type="button">Dismiss</button>
              </div>
            </div>
          )}

          {clashes.length === 0 && !pendingShareClash && (
            <div className="pulse-empty">
              No clashes yet. Challenge someone from any market card.
            </div>
          )}

          <div className="pulse-clash-list">
            {clashes.map((clash) => {
              const myNullifier = humanIdentity?.wallet ?? "";
              const { expired } = formatCountdown(clash.expiresAt);
              return (
                <div key={clash.id} className={`pulse-clash-card ${clash.status}`}>
                  <div className="pulse-clash-card-top">
                    <span className={`pulse-goal-status-badge ${clash.status === "active" ? "active" : clash.status === "resolved" ? (clash.winnerNullifier === myNullifier ? "completed" : "failed") : clash.status === "expired" ? "cancelled" : "active"}`}>
                      {clashStatusLabel(clash, myNullifier)}
                    </span>
                    {clash.status === "pending" && !expired && <span className="pulse-chip pulse-chip-time">{formatCountdown(clash.expiresAt).label} left</span>}
                  </div>
                  <strong className="pulse-goal-title">{clash.marketTitle}</strong>
                  <div className="pulse-clash-card-detail">
                    <span>vs <strong>{clashOpponent(clash, myNullifier)}</strong></span>
                    <span>{clash.stakeWld} WLD each</span>
                    <span>You bet <strong>{(clash.creatorNullifier === myNullifier ? clash.creatorPosition : clash.challengerPosition).toUpperCase()}</strong></span>
                  </div>
                  {clash.status === "resolved" && clash.payoutWld && clash.winnerNullifier === myNullifier && (
                    <div className="pulse-my-bet-badge yes">🏆 Won {clash.payoutWld} WLD</div>
                  )}
                  {clash.status === "pending" && (
                    <button
                      className="pulse-share-clash-btn"
                      onClick={async () => {
                        const { worldLink, webLink } = getClashShareUrl(clash.id);
                        try {
                          const { shareWithWorld } = await import("@/lib/world");
                          await shareWithWorld({ title: "⚔️ PULSE Clash", text: `Challenge: ${clash.marketTitle}`, url: worldLink });
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
      {pulseTab === "leagues" && (
        <div className="pulse-content">
          {/* Your score card */}
          {bets.length > 0 && (
            <div className="pulse-your-score">
              <div className="pulse-your-score-top">
                <Users size={18} />
                <strong>Your Forecast Record</strong>
              </div>
              <div className="pulse-your-score-grid">
                <div><b>{stats.totalBets}</b><span>Total Bets</span></div>
                <div><b>{stats.winRate}%</b><span>Win Rate</span></div>
                <div><b>{stats.currentStreak > 0 ? `🔥 ${stats.currentStreak}` : "—"}</b><span>Streak</span></div>
                <div><b>{stats.totalWon > 0 ? `${stats.totalWon}` : "—"}</b><span>WLD Won</span></div>
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="pulse-section-head">
            <Trophy size={16} />
            <strong>Top Forecasters — All Time</strong>
          </div>

          {copyFollows.length > 0 && (
            <div className="pulse-copy-feed">
              <div className="pulse-section-head" style={{ marginBottom: 8 }}>
                <Users size={15} />
                <strong>Following — Auto-copy suggestions</strong>
              </div>
              {copyFollows.map((follow) => (
                <div key={follow.leaderNullifier} className="pulse-copy-follow-row">
                  <div className="pulse-leader-avatar" style={{ width: 34, height: 34, fontSize: "0.82rem" }}>{follow.leaderUsername.replace(/^@/, "").charAt(0).toUpperCase()}</div>
                  <div className="pulse-leader-info">
                    <strong>{follow.leaderUsername}</strong>
                    <span>Copy at {Math.round(follow.copyFraction * 100)}% of their stake</span>
                  </div>
                  <button
                    className="pulse-unfollow-btn"
                    onClick={() => handleCopyToggle({ nullifier: follow.leaderNullifier, username: follow.leaderUsername })}
                    type="button"
                  >
                    <UserMinus size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="pulse-leaderboard">
            {leaderboard.map((entry) => {
              const following = isFollowing(entry.username);
              return (
                <div key={entry.rank} className="pulse-leader-row">
                  <div className="pulse-leader-rank">
                    {entry.badge ? <span>{entry.badge}</span> : <span>#{entry.rank}</span>}
                  </div>
                  <div className="pulse-leader-avatar">{entry.initial}</div>
                  <div className="pulse-leader-info">
                    <strong>{entry.username}</strong>
                    <span>{entry.specialty} · {entry.totalBets} bets · 🔥{entry.streak}</span>
                  </div>
                  <div className="pulse-leader-right">
                    <b>{entry.winRate}%</b>
                    <small>+{entry.totalWonWld.toLocaleString()} WLD</small>
                    <button
                      className={`pulse-follow-btn${following ? " following" : ""}`}
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

          <div className="pulse-league-cta">
            <div>
              <Zap size={16} />
              <strong>Leagues coming soon</strong>
              <p>Form a team of 5 verified humans. Compete weekly. Top teams earn WLD prize pools.</p>
            </div>
            <button className="pulse-cta-btn" type="button" onClick={() => {
              earnPoints(2, "Joined PULSE Leagues waitlist");
              recordHistory({ title: "PULSE Leagues waitlist", detail: "Joined the PULSE team forecasting waitlist.", kind: "profile" });
            }}>
              Join Waitlist <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── GOALS TAB ── */}
      {pulseTab === "goals" && (
        <div className="pulse-content">
          <div className="pulse-goals-hero">
            <Target size={32} />
            <strong>Stake your goals. Prove yourself.</strong>
            <p>Set a personal goal, stake WLD, and let your verified human network back you — or bet you will fail.</p>
          </div>

          <button
            className="pulse-new-goal-btn"
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
            <div className="pulse-empty" style={{ marginTop: 24 }}>
              No active goals yet. Create one and challenge your network to back you.
            </div>
          )}

          {goals.length > 0 && (
            <div className="pulse-goal-list">
              {goals.map((goal) => {
                const { label } = formatCountdown(goal.deadline);
                const total = goal.yesPool + goal.noPool;
                const yesPct = total > 0 ? Math.round((goal.yesPool / total) * 100) : 100;
                return (
                  <div key={goal.id} className={`pulse-goal-card ${goal.status}`}>
                    <div className="pulse-goal-card-top">
                      <span className={`pulse-goal-status-badge ${goal.status}`}>
                        {goal.status === "active" ? "🔥 Active" : goal.status === "completed" ? "✅ Done" : goal.status === "failed" ? "❌ Failed" : "🚫 Cancelled"}
                      </span>
                      {goal.status === "active" && <span className="pulse-chip pulse-chip-time">{label} left</span>}
                    </div>
                    <strong className="pulse-goal-title">{goal.title}</strong>
                    {goal.description && <p className="pulse-goal-desc">{goal.description}</p>}

                    <div className="pulse-pool-bar-wrap" style={{ marginTop: 8 }}>
                      <div className="pulse-pool-bar">
                        <div className="pulse-pool-bar-yes" style={{ width: `${yesPct}%` }} />
                      </div>
                      <div className="pulse-pool-labels">
                        <span className="pulse-yes-label">Backers {yesPct}%</span>
                        <span className="pulse-no-label">Doubters {100 - yesPct}%</span>
                      </div>
                    </div>

                    <div className="pulse-market-meta">
                      <span>💰 {goal.stakeWld} WLD staked</span>
                      <span>🏦 {formatPoolSize(total)} total pool</span>
                    </div>

                    {goal.status === "active" && (
                      <div className="pulse-goal-actions">
                        <button className="pulse-goal-complete-btn" onClick={() => markGoalComplete(goal.id)} type="button">
                          ✓ Mark Complete
                        </button>
                        <button className="pulse-goal-cancel-btn" onClick={() => cancelGoal(goal.id)} type="button">
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
    </div>
  );
}
