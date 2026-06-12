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

import { useCallback, useEffect, useState } from "react";
import { Award, ChevronRight, Copy, Gift, LogOut, Moon, Settings, Shield, Star, Sun, TrendingUp, X, Zap } from "lucide-react";
import type { VerifiedHuman } from "@/types/user";
import type { VerdexBet, VerdexCopyFollow, VerdexLeaderEntry } from "@/types/verdex";
import type { VerdexTheme } from "@/lib/verdex/theme";
import { getStreakMultiplier } from "@/lib/verdex/data";
import { shareWithWorld, hapticSuccess } from "@/lib/world";
import { VERDEX_APP_ID } from "@/lib/worldConfig";

// ── Props ─────────────────────────────────────────────────────────────────────

type ProfileSheetProps = {
  user: VerifiedHuman;
  bets: VerdexBet[];
  follows: VerdexCopyFollow[];
  leaderboard: VerdexLeaderEntry[];
  theme: VerdexTheme;
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

function winRate(bets: VerdexBet[]): number {
  const settled = bets.filter((b) => b.settled);
  if (!settled.length) return 0;
  const won = settled.filter((b) => (b.payout ?? 0) > b.amountWld).length;
  return Math.round((won / settled.length) * 100);
}

function totalWldWon(bets: VerdexBet[]): string {
  const total = bets
    .filter((b) => b.settled && (b.payout ?? 0) > b.amountWld)
    .reduce((s, b) => s + (b.payout ?? 0), 0);
  return total > 0 ? total.toFixed(2) : "—";
}

function currentStreak(bets: VerdexBet[]): number {
  const settled = [...bets.filter((b) => b.settled)].reverse();
  let streak = 0;
  for (const b of settled) {
    if ((b.payout ?? 0) > b.amountWld) streak++;
    else break;
  }
  return streak;
}

function getUserRank(username: string, leaderboard: VerdexLeaderEntry[]): number | null {
  const entry = leaderboard.find(
    (e) => e.username.toLowerCase() === username.toLowerCase()
  );
  return entry?.rank ?? null;
}

function getInitials(username: string): string {
  const clean = username.replace(/^@/, "").trim();
  return (clean.charAt(0) || "H").toUpperCase();
}

// ── Avatar ────────────────────────────────────────────────────────────────────
// First letter of the username; the profile image is only shown once it has
// actually loaded, so a broken URL can never render alt-text inside the circle.

function Avatar({ user, size = 72 }: { user: VerifiedHuman; size?: number }) {
  const [imgOk, setImgOk] = useState(false);

  return (
    <div className="verdex-profile-avatar" style={{ width: size, height: size, fontSize: size * 0.42, position: "relative" }}>
      {getInitials(user.username)}
      {user.profilePictureUrl && (
        <img
          src={user.profilePictureUrl}
          alt=""
          width={size}
          height={size}
          className="verdex-profile-avatar-img"
          style={{ width: size, height: size, position: "absolute", inset: 0, borderRadius: "50%", objectFit: "cover", display: imgOk ? "block" : "none" }}
          onLoad={() => setImgOk(true)}
          onError={() => setImgOk(false)}
        />
      )}
    </div>
  );
}

// ── Invite & Earn ─────────────────────────────────────────────────────────────
// Referral engine: every verified human you bring in earns you real WLD the
// moment they place their first bet. The share link deep-links into World App.

function InviteEarnCard({ user }: { user: VerifiedHuman }) {
  const [stats, setStats] = useState<{ invited: number; rewarded: number; earnedWld: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const isRealWallet = /^0x[a-fA-F0-9]{40}$/.test(user.wallet);
  const inviteUrl = `https://worldcoin.org/mini-app?app_id=${VERDEX_APP_ID}&path=${encodeURIComponent(`/?ref=${user.wallet}`)}`;

  useEffect(() => {
    if (!isRealWallet) return;
    fetch(`/api/verdex/referral?nullifier=${user.wallet}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { ok: boolean; invited?: number; rewarded?: number; earnedWld?: number }) => {
        if (j.ok) setStats({ invited: j.invited ?? 0, rewarded: j.rewarded ?? 0, earnedWld: j.earnedWld ?? 0 });
      })
      .catch(() => null);
  }, [user.wallet, isRealWallet]);

  if (!isRealWallet) return null;

  async function handleShare() {
    void hapticSuccess();
    await shareWithWorld({
      title: "Join me on VeRdex 🔮",
      text: `I'm predicting real-world events for real WLD on VeRdex — verified humans only, provably fair, instant payouts. Join with my link and let's see who reads the world better:`,
      url: inviteUrl,
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="verdex-profile-section">
      <div className="verdex-profile-section-header">
        <Gift size={14} />
        <span>Invite &amp; Earn</span>
      </div>
      <div className="verdex-invite-card">
        <p className="verdex-invite-pitch">
          Earn <strong>0.2 WLD</strong> for every verified human who joins with your link and places their first bet — paid straight to your wallet.
        </p>
        <div className="verdex-invite-stats">
          <div><strong>{stats?.invited ?? 0}</strong><span>invited</span></div>
          <div><strong>{stats?.rewarded ?? 0}</strong><span>now betting</span></div>
          <div><strong>{(stats?.earnedWld ?? 0).toFixed(1)}</strong><span>WLD earned</span></div>
        </div>
        <button className="verdex-cta-btn verdex-invite-btn" onClick={() => void handleShare()} type="button">
          <Gift size={15} /> {copied ? "Link shared! 🎉" : "Share my invite link"}
        </button>
      </div>
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
  const { label: streakLabel } = getStreakMultiplier(streak);

  const recentBets = [...bets].slice(-5).reverse();

  const handleSignOut = useCallback(() => {
    onClose();
    setTimeout(onSignOut, 300); // let sheet close animate
  }, [onClose, onSignOut]);

  return (
    <div
      className="verdex-sheet-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="verdex-profile-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Your VeRdex Profile"
      >
        {/* Drag handle */}
        <div className="verdex-sheet-handle" />

        {/* Close button */}
        <button className="verdex-profile-close" onClick={onClose} type="button" aria-label="Close profile">
          <X size={18} />
        </button>

        {/* ── Identity ──────────────────────────────────────────────────────── */}
        <div className="verdex-profile-identity">
          <Avatar user={user} size={76} />

          <div className="verdex-profile-identity-text">
            {/* Username — primary, per World docs */}
            <h2 className="verdex-profile-username">{user.username}</h2>

            {/* World ID verified badge */}
            <div className="verdex-profile-verified">
              <Shield size={13} />
              <span>World ID Verified</span>
            </div>

            {/* Wallet — secondary, truncated, per docs */}
            {user.wallet !== "0xpreview" && (
              <span className="verdex-profile-wallet">
                {truncateAddress(user.wallet)}
              </span>
            )}
          </div>

          {/* Leaderboard rank badge */}
          {rank && (
            <div className="verdex-profile-rank">
              <Star size={12} />
              <span>#{rank}</span>
            </div>
          )}
        </div>

        {/* ── Stats grid ────────────────────────────────────────────────────── */}
        <div className="verdex-profile-stats">
          <div className="verdex-profile-stat">
            <strong>{bets.length}</strong>
            <span>Predictions</span>
          </div>
          <div className="verdex-profile-stat">
            <strong style={{ color: "var(--verdex-yes)" }}>{rate > 0 ? `${rate}%` : "—"}</strong>
            <span>Win Rate</span>
          </div>
          <div className="verdex-profile-stat">
            <strong style={{ color: "var(--verdex-gold)" }}>{won}</strong>
            <span>WLD Earned</span>
          </div>
          <div className="verdex-profile-stat">
            <strong style={{ color: streak > 0 ? "var(--verdex-yes)" : "var(--verdex-muted)" }}>
              {streak > 0 ? `🔥${streak}` : "—"}
            </strong>
            <span>Streak</span>
          </div>
        </div>

        {/* Streak multiplier banner */}
        {streak >= 5 && (
          <div className="verdex-profile-streak-banner">
            <Zap size={14} />
            <span>{streakLabel} — {streak} wins in a row. Keep the heat alive! 🔥</span>
          </div>
        )}

        {/* ── Followed forecasters ──────────────────────────────────────────── */}
        {follows.length > 0 && (
          <div className="verdex-profile-section">
            <div className="verdex-profile-section-header">
              <Copy size={14} />
              <span>Copying {follows.length} forecaster{follows.length > 1 ? "s" : ""}</span>
            </div>
            <div className="verdex-profile-follows">
              {follows.slice(0, 4).map((f) => {
                const entry = leaderboard.find((e) => e.username === f.leaderUsername);
                return (
                  <div key={f.leaderNullifier} className="verdex-profile-follow-row">
                    <div className="verdex-profile-follow-avatar">{getInitials(f.leaderUsername)}</div>
                    <div className="verdex-profile-follow-info">
                      <strong>{f.leaderUsername}</strong>
                      {entry && <span>{entry.winRate}% win rate · {entry.specialty}</span>}
                    </div>
                    <button
                      className="verdex-profile-unfollow"
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
          <div className="verdex-profile-section">
            <div className="verdex-profile-section-header">
              <TrendingUp size={14} />
              <span>Recent Predictions</span>
            </div>
            <div className="verdex-profile-bets">
              {recentBets.map((bet) => {
                const wonBet = bet.settled && (bet.payout ?? 0) > bet.amountWld;
                const lostBet = bet.settled && !wonBet;
                return (
                  <div key={bet.id} className="verdex-profile-bet-row">
                    <div className={`verdex-profile-bet-dot ${wonBet ? "won" : lostBet ? "lost" : "pending"}`} />
                    <div className="verdex-profile-bet-info">
                      <span className="verdex-profile-bet-title">{bet.marketTitle ?? bet.marketId}</span>
                      <span className="verdex-profile-bet-meta">
                        {bet.position.toUpperCase()} · {bet.amountWld} WLD
                        {wonBet && bet.payout && <span className="verdex-profile-bet-won"> +{bet.payout.toFixed(2)} WLD</span>}
                      </span>
                    </div>
                    <span className={`verdex-profile-bet-badge ${wonBet ? "won" : lostBet ? "lost" : "open"}`}>
                      {wonBet ? "✓ Won" : lostBet ? "✗ Lost" : "Open"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Invite & Earn ────────────────────────────────────────────────── */}
        <InviteEarnCard user={user} />

        {/* ── Settings ─────────────────────────────────────────────────────── */}
        <div className="verdex-profile-section">
          <div className="verdex-profile-section-header">
            <Settings size={14} />
            <span>Settings</span>
          </div>

          {/* Theme toggle */}
          <button className="verdex-profile-setting-row" onClick={onThemeToggle} type="button">
            <div className="verdex-profile-setting-left">
              {theme === "night" ? <Moon size={16} /> : <Sun size={16} />}
              <span>{theme === "night" ? "Night Mode" : "Day Mode"}</span>
            </div>
            <div className={`verdex-profile-theme-chip ${theme}`}>
              {theme === "night" ? "🌙 Night" : "☀️ Day"}
            </div>
          </button>

          {/* Leaderboard */}
          <div className="verdex-profile-setting-row">
            <div className="verdex-profile-setting-left">
              <Award size={16} />
              <span>Your ranking</span>
            </div>
            <span className="verdex-profile-setting-value">
              {rank ? `#${rank} globally` : "Unranked — keep predicting"}
              <ChevronRight size={14} />
            </span>
          </div>

          {/* Mode badge */}
          <div className="verdex-profile-setting-row">
            <div className="verdex-profile-setting-left">
              <Shield size={16} />
              <span>Account type</span>
            </div>
            <span className="verdex-profile-setting-value" style={{ color: user.mode === "world" ? "var(--verdex-yes)" : "var(--verdex-muted)" }}>
              {user.mode === "world" ? "World ID Verified" : "Preview mode"}
            </span>
          </div>
        </div>

        {/* ── Sign out ──────────────────────────────────────────────────────── */}
        <button className="verdex-profile-signout" onClick={handleSignOut} type="button">
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
  bets: VerdexBet[];
  onClick: () => void;
};

export function ProfileTrigger({ user, bets, onClick }: ProfileTriggerProps) {
  const streak = currentStreak(bets);
  return (
    <button
      className="verdex-profile-trigger"
      onClick={onClick}
      type="button"
      aria-label="Open your profile"
    >
      {/* Mini avatar — first letter, image only overlays once loaded */}
      <div className="verdex-profile-trigger-avatar">
        <Avatar user={user} size={32} />
        {/* World ID green dot */}
        {user.mode === "world" && <div className="verdex-profile-trigger-dot" />}
      </div>
      {/* Username */}
      <div className="verdex-profile-trigger-info">
        <span className="verdex-profile-trigger-name">{user.username}</span>
        {streak > 0 && <span className="verdex-profile-trigger-streak">🔥{streak}</span>}
      </div>
    </button>
  );
}
