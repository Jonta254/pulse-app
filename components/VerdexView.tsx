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
  loadVerdexCombos,
  loadVerdexGoals,
  saveVerdexBets,
  saveVerdexCombos,
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
import type { VerdexBet, VerdexCategory, VerdexClash, VerdexCombo, VerdexComboPick, VerdexCopyFollow, VerdexGoal, VerdexMarket, VerdexTab } from "@/types/verdex";
import type { EarnPoints, OpenPayment } from "@/types/ui";
import type { HistoryRecord } from "@/types/reputation";
import type { VerifiedHuman } from "@/types/user";
import type { VerdexTheme } from "@/lib/verdex/theme";
import { ProfileSheet, ProfileTrigger } from "./ProfileSheet";
import { WinningsPanel } from "./WinningsPanel";
import { VERDEX_APP_ID } from "@/lib/worldConfig";
import { VerdexMark } from "./VerdexMark";

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
  comboPick,
  onBet,
  onClash,
  onAddCombo,
  onRemoveCombo,
}: {
  market: VerdexMarket;
  myBet: VerdexBet | undefined;
  comboPick: VerdexComboPick | undefined;
  onBet: (market: VerdexMarket, position: "yes" | "no") => void;
  onClash: (market: VerdexMarket) => void;
  onAddCombo: (market: VerdexMarket, position: "yes" | "no") => void;
  onRemoveCombo: (marketId: string) => void;
}) {
  const { expired, urgent } = formatCountdown(market.closesAt);
  const meta   = categoryMeta[market.category];
  const total  = market.yesPool + market.noPool;
  const yesPct = calcYesPct(market.yesPool, market.noPool);
  const yesOdds = calcOdds("yes", market.yesPool, market.noPool);
  const noOdds  = calcOdds("no",  market.yesPool, market.noPool);

  // Psychology: flag "underdog" side when crowd piles > 68% one way
  const crowdOnYes = yesPct >= 68;
  const crowdOnNo  = yesPct <= 32;
  // HOT badge: pool > 50 WLD or 10+ bettors
  const isHot = total >= 50 || (market.totalBettors ?? 0) >= 10;
  // Treat status=open AND not expired as truly live
  const isLive = market.status === "open" && !expired;

  const cardClass = [
    "vmc",
    market.featured ? "vmc--featured" : "",
    urgent          ? "vmc--urgent"   : "",
    expired         ? "vmc--closed"   : "",
    !isLive         ? "vmc--dimmed"   : "",
  ].filter(Boolean).join(" ");

  const borderColor = market.featured ? "rgba(245,158,11,0.55)" : `${meta.color}30`;

  return (
    <article
      className={cardClass}
      style={{ borderColor }}
    >
      {/* ── Category header ──────────────────────────────────────────────── */}
      <div
        className="vmc-header"
        style={{
          background: `linear-gradient(135deg, ${meta.color}18, ${meta.color}06)`,
          borderBottomColor: `${meta.color}20`,
        }}
      >
        <div className="vmc-header-left">
          <span className="vmc-cat-badge" style={{ background: `${meta.color}18`, color: meta.color, borderColor: `${meta.color}40` }}>
            {meta.emoji} {meta.label.toUpperCase()}
          </span>
          {market.featured && <span className="vmc-featured-badge">⭐ FEATURED</span>}
          {isHot && isLive && !market.featured && <span className="vmc-hot-badge">🔥 HOT</span>}
          {market.aiGenerated && <span className="vmc-ai-badge">AI</span>}
        </div>
        <div className="vmc-header-right">
          {isLive && total > 0 && <span className="vmc-live-dot" aria-label="Live" />}
          {!isLive && <span className="vmc-closed-tag">CLOSED</span>}
          <CountdownChip closesAt={market.closesAt} />
        </div>
      </div>

      {/* ── Title ────────────────────────────────────────────────────────── */}
      <h3 className="vmc-title">{market.title}</h3>
      {market.id.startsWith("data-v1-") && (
        <span className="vmc-fair-badge">⚖️ Provably fair · auto-resolves from public data</span>
      )}

      {/* ── My bet banner ────────────────────────────────────────────────── */}
      {myBet && (
        <div className={`vmc-mybet vmc-mybet--${myBet.position}`}>
          <span className="vmc-mybet-icon">{myBet.position === "yes" ? "✓" : "✗"}</span>
          <div>
            <strong>You staked {myBet.amountWld} WLD on {myBet.position.toUpperCase()}</strong>
            <span>Awaiting resolution</span>
          </div>
        </div>
      )}

      {/* ── ARENA — YES vs NO duel ───────────────────────────────────────── */}
      <div className={`vmc-arena${!isLive ? " vmc-arena--closed" : ""}`}>
        {/* YES side — always 50% wide so odds are always readable */}
        {isLive && !myBet ? (
          <button className="vmc-arena-yes" onClick={() => onBet(market, "yes")} type="button">
            <span className="vmc-arena-dir vmc-arena-dir--yes">YES</span>
            <strong className="vmc-arena-odds vmc-arena-odds--yes">{yesOdds}</strong>
            <span className="vmc-arena-pct vmc-arena-pct--yes">{yesPct}% crowd</span>
            {crowdOnNo && <span className="vmc-underdog">🎯 Underdog</span>}
            {/* Inner fill shows how dominant this side is */}
            <div className="vmc-arena-fill vmc-arena-fill--yes" style={{ width: `${yesPct}%` }} />
          </button>
        ) : (
          <div className="vmc-arena-yes">
            <span className="vmc-arena-dir vmc-arena-dir--yes">YES</span>
            <strong className="vmc-arena-odds vmc-arena-odds--yes">{yesOdds}</strong>
            <span className="vmc-arena-pct vmc-arena-pct--yes">{yesPct}% crowd</span>
            <div className="vmc-arena-fill vmc-arena-fill--yes" style={{ width: `${yesPct}%` }} />
          </div>
        )}

        <div className="vmc-vs-orb"><span>VS</span></div>

        {/* NO side — always 50% wide */}
        {isLive && !myBet ? (
          <button className="vmc-arena-no" onClick={() => onBet(market, "no")} type="button">
            <span className="vmc-arena-dir vmc-arena-dir--no">NO</span>
            <strong className="vmc-arena-odds vmc-arena-odds--no">{noOdds}</strong>
            <span className="vmc-arena-pct vmc-arena-pct--no">{100 - yesPct}% crowd</span>
            {crowdOnYes && <span className="vmc-underdog">🎯 Underdog</span>}
            <div className="vmc-arena-fill vmc-arena-fill--no" style={{ width: `${100 - yesPct}%` }} />
          </button>
        ) : (
          <div className="vmc-arena-no">
            <span className="vmc-arena-dir vmc-arena-dir--no">NO</span>
            <strong className="vmc-arena-odds vmc-arena-odds--no">{noOdds}</strong>
            <span className="vmc-arena-pct vmc-arena-pct--no">{100 - yesPct}% crowd</span>
            <div className="vmc-arena-fill vmc-arena-fill--no" style={{ width: `${100 - yesPct}%` }} />
          </div>
        )}
      </div>

      {/* ── Split bar ────────────────────────────────────────────────────── */}
      <div className="vmc-split-bar">
        <div className="vmc-split-bar-yes" style={{ width: `${yesPct}%` }} />
        <div className="vmc-split-bar-no" style={{ width: `${100 - yesPct}%` }} />
      </div>

      {/* ── Pool meta row ────────────────────────────────────────────────── */}
      <div className="vmc-pool-meta">
        <span className="vmc-pool-yes">YES {yesPct}%</span>
        <span className="vmc-pool-center">
          {total > 0
            ? `${market.totalBettors ?? "—"} humans · ${formatPoolSize(total)}`
            : "Be the first to bet"}
        </span>
        <span className="vmc-pool-no">{100 - yesPct}% NO</span>
      </div>

      {/* ── Action footer ────────────────────────────────────────────────── */}
      {isLive && !myBet && (
        <div className="vmc-actions">
          {comboPick ? (
            <button className="vmc-combo-btn vmc-combo-btn--added" onClick={() => onRemoveCombo(market.id)} type="button">
              <span>✓ In Combo</span>
              <span className="vmc-combo-odds">{comboPick.oddsLabel}</span>
            </button>
          ) : (
            <div className="vmc-combo-add-wrap">
              <button className="vmc-combo-btn vmc-combo-btn--yes" onClick={() => onAddCombo(market, "yes")} type="button">+ YES</button>
              <button className="vmc-combo-btn vmc-combo-btn--no" onClick={() => onAddCombo(market, "no")} type="button">+ NO</button>
            </div>
          )}
          <button
            className={`vmc-clash${market.category === "sports" ? " vmc-clash--hot" : ""}`}
            onClick={() => onClash(market)}
            type="button"
          >
            <Swords size={12} />
            <span>⚔️ 1v1</span>
          </button>
        </div>
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
  const [amount, setAmount]     = useState(1);
  const [custom, setCustom]     = useState("");

  const finalAmount = custom ? parseFloat(custom) || 0 : amount;
  const valid       = finalAmount > 0 && finalAmount <= 100;

  // Live recalculate as stake / position changes
  const payout      = calcPotentialPayout(finalAmount, position, market.yesPool, market.noPool);
  const profit      = Math.round((payout - finalAmount) * 10000) / 10000;
  const multiplier  = finalAmount > 0 ? (payout / finalAmount).toFixed(2) : "—";
  const isYes       = position === "yes";
  const winColor    = isYes ? "var(--verdex-yes)" : "var(--verdex-no)";

  return (
    <div className="verdex-sheet-backdrop" onClick={onClose} role="presentation">
      <div className="verdex-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Place bet">
        <div className="verdex-sheet-handle" />

        {/* Header */}
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

        {/* ── WIN HERO ── the number they're playing for ─────────────────── */}
        <div className="bs-win-hero" style={{ borderColor: `${winColor}30`, background: `color-mix(in srgb, ${winColor} 9%, var(--verdex-surface))` }}>
          <span className="bs-win-label">🏆 You receive if correct</span>
          <strong className="bs-win-amount" style={{ color: winColor }}>
            {valid ? `${payout.toFixed(4)} WLD` : "— WLD"}
          </strong>
          <div className="bs-win-breakdown">
            <span>Stake <b>{valid ? `${finalAmount} WLD` : "—"}</b></span>
            <span className="bs-win-arrow">→</span>
            <span>Profit <b style={{ color: winColor }}>{valid ? `+${profit.toFixed(4)} WLD` : "—"}</b></span>
            <span className="bs-win-arrow">·</span>
            <span>Multiplier <b style={{ color: winColor }}>{valid ? `${multiplier}×` : "—"}</b></span>
          </div>
        </div>

        {/* Stake chips */}
        <div className="verdex-amount-label">Your stake (WLD)</div>
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

        {/* Summary row */}
        <div className="verdex-payout-box">
          <div className="verdex-payout-row">
            <span>Your stake</span>
            <strong>{valid ? `${finalAmount} WLD` : "—"}</strong>
          </div>
          <div className="verdex-payout-row">
            <span>Total return if correct</span>
            <strong className="verdex-payout-highlight">{valid ? `${payout.toFixed(4)} WLD` : "—"}</strong>
          </div>
          <div className="verdex-payout-row">
            <span>Net profit if correct</span>
            <strong className="verdex-profit-pos">{valid ? `+${profit.toFixed(4)} WLD` : "—"}</strong>
          </div>
          <div className="verdex-payout-row">
            <span>Odds multiplier</span>
            <strong style={{ color: "var(--verdex-accent)" }}>{valid ? `${multiplier}×` : "—"}</strong>
          </div>
        </div>

        {/* Confirm — stake → win framing */}
        <button
          className={`verdex-confirm-btn ${position}`}
          disabled={!valid}
          onClick={() => onConfirm(position, finalAmount)}
          type="button"
        >
          <Zap size={16} />
          {valid
            ? `Stake ${finalAmount} WLD · Win up to ${payout.toFixed(2)} WLD`
            : "Enter a stake amount"}
        </button>

        <p className="verdex-sheet-note">
          Payout is an estimate based on current pool. Final amount depends on the pool at market close. Platform fee: 2% of losing pool.
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

// ── Combo Sheet ───────────────────────────────────────────────────────────────

const COMBO_CHIPS = [0.5, 1, 2, 5];
const MAX_PICKS   = 5;

function ComboSheet({
  picks,
  onClose,
  onRemove,
  onConfirm,
}: {
  picks: VerdexComboPick[];
  onClose: () => void;
  onRemove: (marketId: string) => void;
  onConfirm: (stake: number) => void;
}) {
  const [stake, setStake]   = useState(1);
  const [custom, setCustom] = useState("");
  const finalStake  = custom ? parseFloat(custom) || 0 : stake;
  const totalOdds   = picks.reduce((acc, p) => acc * p.oddsNum, 1);
  const totalOddsR  = Math.round(totalOdds * 100) / 100;
  const payout      = Math.round(finalStake * totalOddsR * 100) / 100;
  const profit      = Math.round((payout - finalStake) * 100) / 100;
  const valid       = finalStake > 0 && finalStake <= 100 && picks.length >= 2;

  return (
    <div className="verdex-sheet-backdrop" onClick={onClose} role="presentation">
      <div className="verdex-sheet combo-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Combo bet">
        <div className="verdex-sheet-handle" />

        {/* Header */}
        <div className="combo-sheet-header">
          <div>
            <span className="combo-sheet-kicker">🔮 COMBO PICK · {picks.length} LEGS</span>
            <strong className="combo-sheet-title">All picks must win · Odds multiply</strong>
          </div>
          <button className="verdex-sheet-close" onClick={onClose} type="button" aria-label="Close"><X size={18} /></button>
        </div>

        {/* Win hero */}
        <div className="combo-win-hero">
          <span className="combo-win-label">🏆 If all {picks.length} correct, you receive</span>
          <strong className="combo-win-amount">{valid ? `${payout.toFixed(2)} WLD` : "— WLD"}</strong>
          <div className="combo-win-row">
            <span>Stake <b>{valid ? `${finalStake} WLD` : "—"}</b></span>
            <span className="combo-win-sep">·</span>
            <span>Combined odds <b style={{ color: "#a78bfa" }}>{totalOddsR.toFixed(2)}×</b></span>
            <span className="combo-win-sep">·</span>
            <span>Profit <b style={{ color: "var(--verdex-yes)" }}>{valid ? `+${profit.toFixed(2)} WLD` : "—"}</b></span>
          </div>
        </div>

        {/* Picks list */}
        <div className="combo-picks-list">
          {picks.map((pick) => (
            <div key={pick.marketId} className={`combo-pick-row combo-pick--${pick.position}`}>
              <div className="combo-pick-left">
                <span className={`combo-pick-pos combo-pick-pos--${pick.position}`}>
                  {pick.position.toUpperCase()}
                </span>
                <span className="combo-pick-title">{pick.marketTitle}</span>
              </div>
              <div className="combo-pick-right">
                <strong className="combo-pick-odds">{pick.oddsLabel}</strong>
                <button
                  className="combo-pick-remove"
                  onClick={() => onRemove(pick.marketId)}
                  type="button"
                  aria-label="Remove pick"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {picks.length < 2 && (
          <div className="combo-need-more">
            Add {2 - picks.length} more pick{picks.length === 0 ? "s" : ""} to unlock combo betting
          </div>
        )}

        {/* Stake chips */}
        <div className="verdex-amount-label">Your stake (WLD) — multiplied by {totalOddsR.toFixed(2)}×</div>
        <div className="verdex-amount-chips">
          {COMBO_CHIPS.map((chip) => (
            <button
              key={chip}
              className={`verdex-amount-chip${stake === chip && !custom ? " active" : ""}`}
              onClick={() => { setStake(chip); setCustom(""); }}
              type="button"
            >
              {chip}
            </button>
          ))}
          <input
            className="verdex-amount-custom"
            inputMode="decimal"
            max="100" min="0.1" step="0.1"
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Custom"
            type="number"
            value={custom}
          />
        </div>

        {/* Odds breakdown */}
        <div className="verdex-payout-box">
          {picks.map((p, i) => (
            <div key={p.marketId} className="verdex-payout-row">
              <span>Leg {i + 1}: {p.position.toUpperCase()}</span>
              <strong style={{ color: p.position === "yes" ? "var(--verdex-yes)" : "var(--verdex-no)" }}>{p.oddsLabel}</strong>
            </div>
          ))}
          <div className="combo-payout-divider" />
          <div className="verdex-payout-row">
            <span>Combined odds</span>
            <strong style={{ color: "#a78bfa" }}>{totalOddsR.toFixed(2)}×</strong>
          </div>
          <div className="verdex-payout-row">
            <span>Your stake</span>
            <strong>{valid ? `${finalStake} WLD` : "—"}</strong>
          </div>
          <div className="verdex-payout-row">
            <span>Total return if all correct</span>
            <strong className="verdex-payout-highlight">{valid ? `${payout.toFixed(2)} WLD` : "—"}</strong>
          </div>
          <div className="verdex-payout-row">
            <span>Net profit if all correct</span>
            <strong className="verdex-profit-pos">{valid ? `+${profit.toFixed(2)} WLD` : "—"}</strong>
          </div>
        </div>

        <button
          className="verdex-confirm-btn yes combo-confirm-btn"
          disabled={!valid}
          onClick={() => onConfirm(finalStake)}
          type="button"
        >
          <Zap size={16} />
          {valid
            ? `Stake ${finalStake} WLD · Win up to ${payout.toFixed(2)} WLD`
            : picks.length < 2 ? "Add more picks first" : "Enter a stake amount"}
        </button>

        <p className="verdex-sheet-note">
          All {picks.length} picks must resolve correctly. If any market is voided, that leg is removed and odds recalculate. Platform fee 2%.
        </p>
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

// ── Live payouts ticker ───────────────────────────────────────────────────────
// Recent real on-chain payouts with WorldScan receipts. No other betting app
// can show this strip, because no other app pays instantly on-chain.

function LivePayoutsTicker() {
  const [wins, setWins] = useState<Array<{ name: string; amountWld: number; source: string; txHash: string | null }>>([]);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/verdex/pulse", { cache: "no-store" })
        .then((r) => r.json())
        .then((j: { ok: boolean; wins?: typeof wins }) => { if (alive && j.ok && j.wins) setWins(j.wins); })
        .catch(() => null);
    void load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (wins.length === 0) return null;

  return (
    <div className="verdex-pulse-ticker" aria-label="Recent real payouts">
      <span className="verdex-pulse-ticker-label">💸 PAID OUT</span>
      <div className="verdex-pulse-ticker-scroll">
        {wins.map((w, i) => (
          <a
            key={i}
            className="verdex-pulse-ticker-chip"
            href={w.txHash ? `https://worldscan.org/tx/${w.txHash}` : undefined}
            target="_blank"
            rel="noopener noreferrer"
          >
            <strong>{w.name}</strong> {w.source === "referral" ? "earned" : "won"} {w.amountWld.toFixed(2)} WLD ✓
          </a>
        ))}
      </div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function VerdexView({ earnPoints, humanIdentity, openPayment, recordHistory, theme, onThemeToggle, onSignOut }: VerdexViewProps) {
  const [verdexTab, setVerdexTab] = useState<VerdexTab>("markets");
  const [category, setCategory] = useState<VerdexCategory>("all");
  const [bets, setBets] = useState<VerdexBet[]>(loadVerdexBets);
  const [combos, setCombos] = useState<VerdexCombo[]>(loadVerdexCombos);
  const [goals, setGoals] = useState<VerdexGoal[]>(loadVerdexGoals);
  const [clashes, setClashes] = useState<VerdexClash[]>(loadLocalClashes);
  const [copyFollows, setCopyFollows] = useState<VerdexCopyFollow[]>(loadCopyFollows);
  const [betSheet, setBetSheet] = useState<{ market: VerdexMarket; position: "yes" | "no" } | null>(null);
  const [comboOpen, setComboOpen] = useState(false);
  const [comboPicks, setComboPicks] = useState<VerdexComboPick[]>([]);
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

  // Persist bets, goals, clashes, combos
  useEffect(() => { saveVerdexBets(bets); }, [bets]);
  useEffect(() => { saveVerdexCombos(combos); }, [combos]);
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

  // Open markets first; within open: featured → pool size; then closed at bottom
  const sorted = (() => {
    const now = Date.now();
    const isOpen = (m: VerdexMarket) => m.status === "open" && new Date(m.closesAt).getTime() > now;
    const open   = filtered.filter(isOpen);
    const closed = filtered.filter((m) => !isOpen(m));

    if (category === "micro") {
      // Micro: soonest-closing open first, then closed
      open.sort((a, b) => new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime());
    } else {
      // Featured first, then by pool size (bigger = more social proof)
      open.sort((a, b) => {
        if (b.featured !== a.featured) return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
        return (b.yesPool + b.noPool) - (a.yesPool + a.noPool);
      });
    }
    // Closed sorted by closesAt desc (most recently closed first)
    closed.sort((a, b) => new Date(b.closesAt).getTime() - new Date(a.closesAt).getTime());
    return [...open, ...closed];
  })();

  // ── Combo handlers ───────────────────────────────────────────────────────────
  function handleAddCombo(market: VerdexMarket, position: "yes" | "no") {
    if (comboPicks.length >= MAX_PICKS) return;
    // Replace if same market already picked (switch position)
    const oddsNum   = parseFloat(calcOdds(position, market.yesPool, market.noPool));
    const oddsLabel = calcOdds(position, market.yesPool, market.noPool);
    const pick: VerdexComboPick = {
      marketId: market.id, marketTitle: market.title,
      category: market.category, position, oddsLabel, oddsNum,
    };
    setComboPicks((prev) => {
      const without = prev.filter((p) => p.marketId !== market.id);
      return [...without, pick];
    });
  }

  function handleRemoveCombo(marketId: string) {
    setComboPicks((prev) => prev.filter((p) => p.marketId !== marketId));
  }

  function handleComboConfirm(stake: number) {
    if (comboPicks.length < 2) return;
    const totalOdds = Math.round(comboPicks.reduce((a, p) => a * p.oddsNum, 1) * 100) / 100;
    const projectedPayout = Math.round(stake * totalOdds * 100) / 100;
    const legsLabel = comboPicks.map((p) => `${p.position.toUpperCase()} on "${p.marketTitle.slice(0, 30)}"`).join("; ");
    setComboOpen(false);

    openPayment({
      title: `${comboPicks.length}-Pick Combo · ${totalOdds.toFixed(2)}× odds`,
      amount: stake.toFixed(2),
      detail: `VeRdex ${comboPicks.length}-pick combo: ${legsLabel}`,
      feature: "tip-verdex",
      allowCustomAmount: false,
      success: `Combo placed! If all ${comboPicks.length} picks win → you receive ${projectedPayout.toFixed(2)} WLD 🔮`,
      onConfirmed: async (_amt, txReference) => {
        const combo: VerdexCombo = {
          id: `combo-${Date.now()}`,
          picks: comboPicks,
          stakeWld: stake,
          totalOdds,
          projectedPayout,
          placedAt: new Date().toISOString(),
          txReference,
          status: "open",
        };
        setCombos((prev) => [combo, ...prev]);
        setComboPicks([]);

        fetch("/api/verdex/combo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: combo.id,
            worldNullifier: humanIdentity?.wallet ?? "preview",
            username: humanIdentity?.username,
            picks: combo.picks,
            stakeWld: stake,
            totalOdds,
            projectedPayout,
            txReference,
          }),
        }).catch(() => null);

        earnPoints(10, `VeRdex ${comboPicks.length}-pick combo placed`);
        recordHistory({ title: "VeRdex combo placed", detail: `${comboPicks.length}-pick combo · ${totalOdds.toFixed(2)}× odds · stake ${stake} WLD`, kind: "payment" });
      },
    });
  }

  // ── Bet handler ─────────────────────────────────────────────────────────────
  function handleBetConfirm(position: "yes" | "no", amount: number) {
    if (!betSheet) return;
    const market = betSheet.market;
    // Snapshot projected payout at bet time (pool will change after)
    const projectedPayout = calcPotentialPayout(amount, position, market.yesPool, market.noPool);
    const projectedProfit  = Math.round((projectedPayout - amount) * 10000) / 10000;
    setBetSheet(null);

    openPayment({
      title: `Bet ${amount} WLD on ${position.toUpperCase()}`,
      amount: amount.toFixed(2),
      detail: `VeRdex bet: "${market.title}"`,
      feature: "tip-verdex",
      allowCustomAmount: false,
      success: `Bet placed! If ${position.toUpperCase()} wins → you receive ${projectedPayout.toFixed(2)} WLD (profit: +${projectedProfit.toFixed(2)} WLD)`,
      onConfirmed: async (_amount, txReference) => {
        const betId = `verdex-bet-${Date.now()}`;
        const newBet: VerdexBet = {
          id: betId,
          marketId: market.id,
          marketTitle: market.title,
          position,
          amountWld: amount,
          projectedPayout,
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
            <div className="verdex-brand-icon"><VerdexMark size={36} /></div>
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
          {/* Live on-chain payouts — public proof VeRdex pays */}
          <LivePayoutsTicker />

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
                comboPick={comboPicks.find((p) => p.marketId === market.id)}
                onBet={(m, pos) => setBetSheet({ market: m, position: pos })}
                onClash={(m) => setClashSheet(m)}
                onAddCombo={handleAddCombo}
                onRemoveCombo={handleRemoveCombo}
              />
            ))}
          </div>

          {/* ── Combo tray — hidden when the sheet is open (it covers the button) ── */}
          {comboPicks.length > 0 && !comboOpen && (
            <div className="combo-tray" role="status">
              <div className="combo-tray-left">
                <span className="combo-tray-icon">🔮</span>
                <div>
                  <strong>{comboPicks.length} pick{comboPicks.length > 1 ? "s" : ""}</strong>
                  <span>
                    {Math.round(comboPicks.reduce((a, p) => a * p.oddsNum, 1) * 100) / 100}× combined odds
                    {comboPicks.length < 2 && " · add 1 more"}
                  </span>
                </div>
              </div>
              <div className="combo-tray-right">
                <button className="combo-tray-clear" onClick={() => setComboPicks([])} type="button">✕</button>
                <button
                  className="combo-tray-btn"
                  disabled={comboPicks.length < 2}
                  onClick={() => setComboOpen(true)}
                  type="button"
                >
                  Place Combo
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MY BETS TAB ── */}
      {verdexTab === "mybets" && (
        <div className="verdex-content">
          <div className="verdex-mybets-header">
            <h3>Your Predictions</h3>
            <span>{bets.length} bets · {combos.length} combos</span>
          </div>

          {/* ── Combo bets ─────────────────────────────────────────────── */}
          {combos.length > 0 && (
            <div className="combo-mybets-section">
              <div className="combo-mybets-title">
                <span>🔮</span>
                <strong>Combo Picks</strong>
                <span className="combo-mybets-sub">{combos.filter(c => c.status === "open").length} open</span>
              </div>
              {combos.map((combo) => {
                const openLegs = combo.picks.length;
                const comboProfit = Math.round((combo.projectedPayout - combo.stakeWld) * 100) / 100;
                return (
                  <div key={combo.id} className={`combo-mybet-card combo-mybet-card--${combo.status}`}>
                    <div className="combo-mybet-top">
                      <span className={`combo-mybet-status combo-mybet-status--${combo.status}`}>
                        {combo.status === "open" ? "⏳ Open" : combo.status === "won" ? "🏆 Won" : combo.status === "lost" ? "✗ Lost" : "↩ Void"}
                      </span>
                      <span className="combo-mybet-odds">{combo.totalOdds.toFixed(2)}× combo</span>
                    </div>

                    {/* Potential win hero */}
                    {combo.status === "open" && (
                      <div className="combo-mybet-win">
                        <span>All {openLegs} correct → </span>
                        <strong>{combo.projectedPayout.toFixed(2)} WLD</strong>
                        <span className="combo-mybet-profit"> (+{comboProfit.toFixed(2)})</span>
                      </div>
                    )}
                    {combo.status === "won" && combo.actualPayout && (
                      <div className="combo-mybet-win combo-mybet-win--won">
                        <strong>🏆 Won {combo.actualPayout.toFixed(2)} WLD!</strong>
                      </div>
                    )}

                    {/* Legs */}
                    <div className="combo-mybet-legs">
                      {combo.picks.map((pick) => (
                        <div key={pick.marketId} className="combo-mybet-leg">
                          <span className={`combo-mybet-leg-pos combo-mybet-leg-pos--${pick.position}`}>{pick.position.toUpperCase()}</span>
                          <span className="combo-mybet-leg-title">{pick.marketTitle.length > 45 ? pick.marketTitle.slice(0, 45) + "…" : pick.marketTitle}</span>
                          <span className="combo-mybet-leg-odds">{pick.oddsLabel}</span>
                        </div>
                      ))}
                    </div>

                    <div className="combo-mybet-meta">
                      <span>Staked: {combo.stakeWld} WLD</span>
                      <span>{new Date(combo.placedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MY BETS TAB (single bets) ── */}
      {verdexTab === "mybets" && (
        <div className="verdex-content" style={{ paddingTop: 0 }}>
          <div className="verdex-mybets-header" style={{ marginTop: combos.length > 0 ? 8 : 0 }}>
            <h3>Single Bets</h3>
            <span>{bets.length} total · {bets.filter(b => !b.settled).length} open</span>
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

                // For open bets: use stored snapshot first, fall back to live market
                const market = localMarkets.find(m => m.id === bet.marketId);
                const livePayout = market
                  ? calcPotentialPayout(bet.amountWld, bet.position, market.yesPool, market.noPool)
                  : null;
                const displayPayout = livePayout ?? bet.projectedPayout ?? null;
                const displayProfit = displayPayout != null
                  ? Math.round((displayPayout - bet.amountWld) * 10000) / 10000
                  : null;

                const actualProfit = won ? +((bet.payout ?? 0) - bet.amountWld).toFixed(4) : 0;

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

                    {/* Win projection hero — shown for open bets */}
                    {open && displayPayout != null && (
                      <div className="verdex-mybet-win-hero">
                        <span className="verdex-mybet-win-label">🏆 If {bet.position.toUpperCase()} wins</span>
                        <div className="verdex-mybet-win-row">
                          <strong className="verdex-mybet-win-amount">
                            {displayPayout.toFixed(4)} WLD
                          </strong>
                          <span className="verdex-mybet-win-profit">
                            +{displayProfit?.toFixed(4)} profit
                          </span>
                        </div>
                        <span className="verdex-mybet-win-note">
                          Estimated · updates as more humans bet
                        </span>
                      </div>
                    )}

                    <div className="verdex-mybet-amounts">
                      <div className="verdex-mybet-staked">
                        <span>Staked</span>
                        <strong>{bet.amountWld} WLD</strong>
                      </div>
                      {won ? (
                        <div className="verdex-mybet-payout won">
                          <span>You received</span>
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
                      <>
                        <div className="verdex-mybet-note won">
                          🎉 Winning! Claim your WLD above or it auto-pays to your wallet at distribution.
                        </div>
                        <button
                          className="verdex-winshare-btn"
                          type="button"
                          onClick={async () => {
                            const { shareWithWorld } = await import("@/lib/world");
                            await shareWithWorld({
                              title: "I just won on VeRdex 🔮",
                              text: `I predicted "${bet.marketTitle}" and won ${(bet.payout ?? 0).toFixed(2)} WLD — paid instantly to my wallet, on-chain. Think you read the world better? Prove it:`,
                              url: `https://worldcoin.org/mini-app?app_id=${VERDEX_APP_ID}&path=${encodeURIComponent(`/?ref=${humanIdentity?.wallet ?? ""}`)}`,
                            });
                          }}
                        >
                          📣 Share this win — earn 0.2 WLD per friend who joins
                        </button>
                      </>
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

      {/* Combo sheet */}
      {comboOpen && (
        <ComboSheet
          picks={comboPicks}
          onClose={() => setComboOpen(false)}
          onRemove={handleRemoveCombo}
          onConfirm={handleComboConfirm}
        />
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
