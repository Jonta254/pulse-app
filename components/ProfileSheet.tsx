"use client";

/**
 * ProfileSheet — full user profile accessed from the header avatar.
 *
 * Per World Developer docs:
 * - Display username, NOT wallet address prominently (docs: "use usernames not wallet addresses")
 * - Show World ID verified badge
 * - Profile picture from MiniKit.user.profilePictureUrl if available
 * - Wallet shown truncated, not primary
 *
 * Features:
 * - Avatar + username + World ID verified badge
 * - Stats: predictions, win rate, WLD earned, streak + multiplier
 * - Leaderboard rank
 * - Followed forecasters (copy betting)
 * - Recent predictions history
 * - Theme toggle (day/night)
 * - Sign out
 */

import { useCallback } from "react";
import { Award, ChevronRight, Copy, LogOut, Moon, Settings, Shield, Star, Sun, TrendingUp, X, Zap } from "lucide-react";
import type { VerifiedHuman } from "@/types/user";
import type { PulseBet, PulseCopyFollow, PulseLeaderEntry } from "@/types/pulse";
import type { PulseTheme } from "@/lib/pulse/theme";
import { getStreakMultiplier } from "@/lib/pulse/data";

// ── Props ─────────────────────────────────────────────────────────────────────

type ProfileSheetProps = {
  user: VerifiedHuman;
  bets: PulseBet[];
  follows: PulseCopyFollow[];
  leaderboard: PulseLeaderEntry[];
  theme: PulseTheme;
  onThemeToggle: () => void;
  onUnfollow: (nullifier: string) => void;
  onClose: () => void;
  onSignOut: () => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncateAddress(addr: string) {
  if (!addr || addr === "0xpreview") return "preview";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function winRate(bets: PulseBet[]): number {
  const settled = bets.filter((b) => b.settled);
  if (!settled.length) return 0;
  const won = settled.filter((b) => (b.payout ?? 0) > b.amountWld).length;
  return Math.round((won / settled.length) * 100);
}

function totalWldWon(bets: PulseBet[]): string {
  const total = bets
    .filter((b) => b.settled && (b.payout ?? 0) > b.amountWld)
    .reduce((s, b) => s + (b.payout ?? 0), 0);
  return total > 0 ? total.toFixed(2) : "—";
}

function currentStreak(bets: PulseBet[]): number {
  const settled = [...bets.filter((b) => b.settled)].reverse();
  let streak = 0;
  for (const b of settled) {
    if ((b.payout ?? 0) > b.amountWld) streak++;
    else break;
  }
  return streak;
}

function getUserRank(username: string, leaderboard: PulseLeaderEntry[]): number | null {
  const entry = leaderboard.find(
    (e) => e.username.toLowerCase() === username.toLowerCase()
  );
  return entry?.rank ?? null;
}

function getInitials(username: string): string {
  const clean = username.replace(/^@/, "");
  return clean.slice(0, 2).toUpperCase();
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ user, size = 72 }: { user: VerifiedHuman; size?: number }) {
  if (user.profilePictureUrl) {
    return (
      <img
        src={user.profilePictureUrl}
        alt={user.username}
        width={size}
        height={size}
        className="pulse-profile-avatar-img"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div className="pulse-profile-avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {getInitials(user.username)}
    </div>
  );
}

// ── ProfileSheet ──────────────────────────────────────────────────────────────

export function ProfileSheet({
  user, bets, follows, leaderboard,
  theme, onThemeToggle, onUnfollow, onClose, onSignOut,
}: ProfileSheetProps) {
  const rate   = winRate(bets);
  const won    = totalWldWon(bets);
  const streak = currentStreak(bets);
  const rank   = getUserRank(user.username, leaderboard);
  const { multiplier, label: streakLabel } = getStreakMultiplier(streak);

  const recentBets = [...bets].slice(-5).reverse();

  const handleSignOut = useCallback(() => {
    onClose();
    setTimeout(onSignOut, 300); // let sheet close animate
  }, [onClose, onSignOut]);

  return (
    <div
      className="pulse-sheet-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="pulse-profile-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Your PULSE Profile"
      >
        {/* Drag handle */}
        <div className="pulse-sheet-handle" />

        {/* Close button */}
        <button className="pulse-profile-close" onClick={onClose} type="button" aria-label="Close profile">
          <X size={18} />
        </button>

        {/* ── Identity ──────────────────────────────────────────────────────── */}
        <div className="pulse-profile-identity">
          <Avatar user={user} size={76} />

          <div className="pulse-profile-identity-text">
            {/* Username — primary, per World docs */}
            <h2 className="pulse-profile-username">{user.username}</h2>

            {/* World ID verified badge */}
            <div className="pulse-profile-verified">
              <Shield size={13} />
              <span>World ID Verified</span>
            </div>

            {/* Wallet — secondary, truncated, per docs */}
            {user.wallet !== "0xpreview" && (
              <span className="pulse-profile-wallet">
                {truncateAddress(user.wallet)}
              </span>
            )}
          </div>

          {/* Leaderboard rank badge */}
          {rank && (
            <div className="pulse-profile-rank">
              <Star size={12} />
              <span>#{rank}</span>
            </div>
          )}
        </div>

        {/* ── Stats grid ────────────────────────────────────────────────────── */}
        <div className="pulse-profile-stats">
          <div className="pulse-profile-stat">
            <strong>{bets.length}</strong>
            <span>Predictions</span>
          </div>
          <div className="pulse-profile-stat">
            <strong style={{ color: "var(--pulse-yes)" }}>{rate > 0 ? `${rate}%` : "—"}</strong>
            <span>Win Rate</span>
          </div>
          <div className="pulse-profile-stat">
            <strong style={{ color: "var(--pulse-gold)" }}>{won}</strong>
            <span>WLD Earned</span>
          </div>
          <div className="pulse-profile-stat">
            <strong style={{ color: streak > 0 ? "var(--pulse-yes)" : "var(--pulse-muted)" }}>
              {streak > 0 ? `🔥${streak}` : "—"}
            </strong>
            <span>Streak</span>
          </div>
        </div>

        {/* Streak multiplier banner */}
        {streak >= 5 && (
          <div className="pulse-profile-streak-banner">
            <Zap size={14} />
            <span>{streakLabel} — {multiplier}× payout multiplier active</span>
          </div>
        )}

        {/* ── Followed forecasters ──────────────────────────────────────────── */}
        {follows.length > 0 && (
          <div className="pulse-profile-section">
            <div className="pulse-profile-section-header">
              <Copy size={14} />
              <span>Copying {follows.length} forecaster{follows.length > 1 ? "s" : ""}</span>
            </div>
            <div className="pulse-profile-follows">
              {follows.slice(0, 4).map((f) => {
                const entry = leaderboard.find((e) => e.username === f.leaderUsername);
                return (
                  <div key={f.leaderNullifier} className="pulse-profile-follow-row">
                    <div className="pulse-profile-follow-avatar">{getInitials(f.leaderUsername)}</div>
                    <div className="pulse-profile-follow-info">
                      <strong>{f.leaderUsername}</strong>
                      {entry && <span>{entry.winRate}% win rate · {entry.specialty}</span>}
                    </div>
                    <button
                      className="pulse-profile-unfollow"
                      onClick={() => onUnfollow(f.leaderNullifier)}
                      type="button"
                      aria-label={`Unfollow ${f.leaderUsername}`}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Recent predictions ────────────────────────────────────────────── */}
        {recentBets.length > 0 && (
          <div className="pulse-profile-section">
            <div className="pulse-profile-section-header">
              <TrendingUp size={14} />
              <span>Recent Predictions</span>
            </div>
            <div className="pulse-profile-bets">
              {recentBets.map((bet) => {
                const wonBet = bet.settled && (bet.payout ?? 0) > bet.amountWld;
                const lostBet = bet.settled && !wonBet;
                return (
                  <div key={bet.id} className="pulse-profile-bet-row">
                    <div className={`pulse-profile-bet-dot ${wonBet ? "won" : lostBet ? "lost" : "pending"}`} />
                    <div className="pulse-profile-bet-info">
                      <span className="pulse-profile-bet-title">{bet.marketTitle ?? bet.marketId}</span>
                      <span className="pulse-profile-bet-meta">
                        {bet.position.toUpperCase()} · {bet.amountWld} WLD
                        {wonBet && bet.payout && <span className="pulse-profile-bet-won"> +{bet.payout.toFixed(2)} WLD</span>}
                      </span>
                    </div>
                    <span className={`pulse-profile-bet-badge ${wonBet ? "won" : lostBet ? "lost" : "open"}`}>
                      {wonBet ? "✓ Won" : lostBet ? "✗ Lost" : "Open"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Settings ─────────────────────────────────────────────────────── */}
        <div className="pulse-profile-section">
          <div className="pulse-profile-section-header">
            <Settings size={14} />
            <span>Settings</span>
          </div>

          {/* Theme toggle */}
          <button className="pulse-profile-setting-row" onClick={onThemeToggle} type="button">
            <div className="pulse-profile-setting-left">
              {theme === "night" ? <Moon size={16} /> : <Sun size={16} />}
              <span>{theme === "night" ? "Night Mode" : "Day Mode"}</span>
            </div>
            <div className={`pulse-profile-theme-chip ${theme}`}>
              {theme === "night" ? "🌙 Night" : "☀️ Day"}
            </div>
          </button>

          {/* Leaderboard */}
          <div className="pulse-profile-setting-row">
            <div className="pulse-profile-setting-left">
              <Award size={16} />
              <span>Your ranking</span>
            </div>
            <span className="pulse-profile-setting-value">
              {rank ? `#${rank} globally` : "Unranked — keep predicting"}
              <ChevronRight size={14} />
            </span>
          </div>

          {/* Mode badge */}
          <div className="pulse-profile-setting-row">
            <div className="pulse-profile-setting-left">
              <Shield size={16} />
              <span>Account type</span>
            </div>
            <span className="pulse-profile-setting-value" style={{ color: user.mode === "world" ? "var(--pulse-yes)" : "var(--pulse-muted)" }}>
              {user.mode === "world" ? "World ID Verified" : "Preview mode"}
            </span>
          </div>
        </div>

        {/* ── Sign out ──────────────────────────────────────────────────────── */}
        <button className="pulse-profile-signout" onClick={handleSignOut} type="button">
          <LogOut size={16} />
          <span>Sign out</span>
        </button>

        {/* Bottom safe area spacer */}
        <div style={{ height: "var(--safe-bottom, 0px)" }} />
      </div>
    </div>
  );
}

// ── ProfileTrigger — the button in the header ─────────────────────────────────

type ProfileTriggerProps = {
  user: VerifiedHuman;
  bets: PulseBet[];
  onClick: () => void;
};

export function ProfileTrigger({ user, bets, onClick }: ProfileTriggerProps) {
  const streak = currentStreak(bets);
  return (
    <button
      className="pulse-profile-trigger"
      onClick={onClick}
      type="button"
      aria-label="Open your profile"
    >
      {/* Mini avatar */}
      <div className="pulse-profile-trigger-avatar">
        {user.profilePictureUrl
          ? <img src={user.profilePictureUrl} alt="" width={32} height={32} />
          : <span>{getInitials(user.username)}</span>
        }
        {/* World ID green dot */}
        {user.mode === "world" && <div className="pulse-profile-trigger-dot" />}
      </div>
      {/* Username */}
      <div className="pulse-profile-trigger-info">
        <span className="pulse-profile-trigger-name">{user.username}</span>
        {streak > 0 && <span className="pulse-profile-trigger-streak">🔥{streak}</span>}
      </div>
    </button>
  );
}
