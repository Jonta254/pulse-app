"use client";

/**
 * PulseApp — root shell for PULSE mini app.
 *
 * Auth flow (per World Developer docs):
 * 1. Wait for MiniKit.isInstalled() before calling any commands (race condition prevention)
 * 2. Call MiniKit.walletAuth() only on user gesture (button tap)
 * 3. Verify SIWE payload on backend before trusting user
 * 4. Read username/address from MiniKit.user after successful auth
 * 5. Request notification permission after first successful login (behaviour-triggered)
 *
 * Vercel deployment protection: DISABLED (ssoProtection: null) — app must be
 * publicly accessible for World App WebView to load it.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import {
  authenticateWithWorld,
  hapticError,
  hapticImpact,
  hapticSelection,
  hapticSuccess,
  isWorldReady,
  payWithWorld,
  requestNotificationPermission,
} from "@/lib/world";
import { applyTheme, getStoredTheme, saveTheme, toggleTheme, type PulseTheme } from "@/lib/pulse/theme";
import { PulseView } from "./PulseView";
import type { HistoryRecord } from "@/types/reputation";
import type { VerifiedHuman } from "@/types/user";
import type { PaymentRequest, Toast } from "@/types/ui";

// ── Types ─────────────────────────────────────────────────────────────────────

type AuthState = "idle" | "checking" | "signing" | "done" | "error";

// ── PulseApp ──────────────────────────────────────────────────────────────────

export function PulseApp() {
  const [user, setUser]                       = useState<VerifiedHuman | null>(null);
  const [authState, setAuthState]             = useState<AuthState>("idle");
  const [authError, setAuthError]             = useState<string | null>(null);
  const [miniKitReady, setMiniKitReady]       = useState(false);
  const [toast, setToast]                     = useState<Toast | null>(null);
  const [paymentPrompt, setPaymentPrompt]     = useState<PaymentRequest | null>(null);
  const [paymentBusy, setPaymentBusy]         = useState(false);
  const [theme, setTheme]                     = useState<PulseTheme>("night");
  const notifRequested                        = useRef(false);

  // ── Theme — load from localStorage on mount, apply to <html> ────────────
  useEffect(() => {
    const stored = getStoredTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  const handleThemeToggle = useCallback(() => {
    void hapticSelection();
    setTheme((prev) => {
      const next = toggleTheme(prev);
      applyTheme(next);
      saveTheme(next);
      return next;
    });
  }, []);

  // ── MiniKit readiness poll (docs: avoid race conditions) ─────────────────
  useEffect(() => {
    // MiniKitProvider installs MiniKit asynchronously. Poll until ready.
    // This prevents "commands fail on page load" race condition from docs.
    let attempts = 0;
    const MAX = 20; // 2 seconds max wait
    const t = setInterval(() => {
      attempts++;
      if (isWorldReady()) {
        setMiniKitReady(true);
        clearInterval(t);
      } else if (attempts >= MAX) {
        // Not inside World App — still show gate (preview mode available)
        setMiniKitReady(false);
        clearInterval(t);
      }
    }, 100);
    return () => clearInterval(t);
  }, []);

  // ── Safe area CSS vars ───────────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--safe-top",    "env(safe-area-inset-top,    0px)");
    root.style.setProperty("--safe-bottom", "env(safe-area-inset-bottom, 0px)");
    root.style.setProperty("--safe-left",   "env(safe-area-inset-left,   0px)");
    root.style.setProperty("--safe-right",  "env(safe-area-inset-right,  0px)");
  }, []);

  // ── Auto-dismiss toast ───────────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── World ID login (walletAuth = SIWE) ───────────────────────────────────
  const handleLogin = useCallback(async () => {
    if (authState === "signing" || authState === "checking") return;
    setAuthError(null);
    setAuthState("checking");

    try {
      setAuthState("signing");
      const result = await authenticateWithWorld();

      if (!result.ok || !result.address) {
        void hapticError();
        const msg = result.error ?? "Open PULSE inside World App.";
        setAuthError(msg);
        setAuthState("error");
        return;
      }

      // Per docs: after walletAuth, read username from MiniKit.user
      // MiniKit.user is populated after successful walletAuth
      const mkUser = isWorldReady()
        ? (MiniKit as unknown as { user?: { username?: string; walletAddress?: string } }).user
        : null;
      const username = mkUser?.username
        ? `@${mkUser.username}`
        : `@${result.address.slice(0, 6)}…${result.address.slice(-4)}`;

      void hapticSuccess();
      setAuthState("done");
      setUser({
        wallet: result.address,
        username,
        mode: "world",
        lastSeenAt: new Date().toISOString(),
      });

      // Request notification permission once, after first login
      // (docs: behaviour-triggered notifications have 2-3x better open rates)
      if (!notifRequested.current) {
        notifRequested.current = true;
        void requestNotificationPermission();
      }
    } catch (err) {
      void hapticError();
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setAuthError(msg);
      setAuthState("error");
    }
  }, [authState]);

  // ── Preview mode (no World App) ──────────────────────────────────────────
  const handlePreview = useCallback(() => {
    setUser({ wallet: "0xpreview", username: "@preview_human", mode: "preview", lastSeenAt: new Date().toISOString() });
  }, []);

  // ── Payment helpers ──────────────────────────────────────────────────────
  const openPayment = useCallback((payment: PaymentRequest) => {
    if (!user || user.mode === "preview") {
      setToast({ title: "Sign in with World ID first", detail: "WLD payments require World App." });
      return;
    }
    setPaymentPrompt(payment);
  }, [user]);

  const confirmPayment = useCallback(async () => {
    if (!paymentPrompt || paymentBusy) return;
    const amount = parseFloat(paymentPrompt.amount);
    if (!amount || amount <= 0) return;
    setPaymentBusy(true);
    try {
      void hapticImpact();
      const result = await payWithWorld({
        amount,
        description: paymentPrompt.detail,
        feature: paymentPrompt.feature ?? "tip-pulse",
      });
      if (!result.ok) {
        void hapticError();
        setToast({
          title: "Payment failed",
          detail: "error" in result && result.error
            ? String(result.error)
            : "Try again inside World App.",
        });
        return;
      }
      void hapticSuccess();
      await paymentPrompt.onConfirmed?.(amount);
      setToast({ title: `${amount} WLD confirmed`, detail: paymentPrompt.success });
      setPaymentPrompt(null);
    } finally {
      setPaymentBusy(false);
    }
  }, [paymentPrompt, paymentBusy]);

  const earnPoints = useCallback((_amount: number, _reason: string) => {}, []);
  const recordHistory = useCallback((_r: Omit<HistoryRecord, "id" | "time">) => {}, []);

  // ── Gate screen ─────────────────────────────────────────────────────────
  if (!user) {
    const isSigning  = authState === "signing";
    const isChecking = authState === "checking";
    const busy       = isSigning || isChecking;
    const inWorldApp = miniKitReady;

    return (
      <div className="pulse-gate">
        <div className="pulse-gate-card">

          {/* Logo + brand */}
          <div className="pulse-gate-logo">
            <span className="pulse-gate-bolt">⚡</span>
          </div>
          <h1 className="pulse-gate-title">PULSE</h1>
          <p className="pulse-gate-sub">Human Prediction Network</p>

          {/* Value props */}
          <div className="pulse-gate-props">
            <div className="pulse-gate-prop">
              <span className="pulse-gate-prop-icon">🔮</span>
              <div>
                <strong>Predict Real Events</strong>
                <span>Crypto, sports, world, culture</span>
              </div>
            </div>
            <div className="pulse-gate-prop">
              <span className="pulse-gate-prop-icon">💰</span>
              <div>
                <strong>Win WLD</strong>
                <span>Pro-rata payout from the pool</span>
              </div>
            </div>
            <div className="pulse-gate-prop">
              <span className="pulse-gate-prop-icon">⚔️</span>
              <div>
                <strong>1v1 Clash</strong>
                <span>Challenge humans — winner takes 90%</span>
              </div>
            </div>
            <div className="pulse-gate-prop">
              <span className="pulse-gate-prop-icon">🛡️</span>
              <div>
                <strong>Zero Bots</strong>
                <span>Every forecaster is World ID verified</span>
              </div>
            </div>
          </div>

          {/* Error message */}
          {authError && (
            <div className="pulse-gate-error" role="alert">
              {authError}
              {!inWorldApp && " · Open this app inside World App."}
            </div>
          )}

          {/* Primary CTA — World ID sign in */}
          <button
            className="pulse-gate-btn"
            disabled={busy}
            onClick={handleLogin}
            type="button"
            aria-busy={busy}
          >
            {isChecking && (
              <span className="pulse-gate-spinner" aria-hidden="true" />
            )}
            {isSigning && (
              <span className="pulse-gate-spinner" aria-hidden="true" />
            )}
            <span className="pulse-gate-worldid-icon" aria-hidden="true">
              {/* World ID orb icon (inline SVG, no external fetch) */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                <ellipse cx="12" cy="12" rx="4" ry="10" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M2 12h20" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </span>
            {isChecking ? "Connecting…" : isSigning ? "Signing in…" : "Continue with World ID"}
          </button>

          {/* Retry button after error */}
          {authState === "error" && (
            <button
              className="pulse-gate-retry"
              onClick={() => { setAuthState("idle"); setAuthError(null); }}
              type="button"
            >
              Try again
            </button>
          )}

          {/* Preview mode — only shown when NOT in World App */}
          {!inWorldApp && authState !== "signing" && authState !== "checking" && (
            <button
              className="pulse-gate-preview"
              onClick={handlePreview}
              type="button"
            >
              Preview (no wallet)
            </button>
          )}

          {/* Legal note */}
          <p className="pulse-gate-legal">
            By continuing you accept the{" "}
            <span style={{ color: "var(--pulse-accent)" }}>Terms of Service</span>.
            Prediction markets involve financial risk.
          </p>
        </div>
      </div>
    );
  }

  // ── Main app ─────────────────────────────────────────────────────────────
  return (
    <div className="pulse-shell">
      <PulseView
        humanIdentity={user}
        openPayment={openPayment}
        earnPoints={earnPoints}
        recordHistory={recordHistory}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        onSignOut={() => setUser(null)}
      />

      {/* Payment confirmation sheet */}
      {paymentPrompt && (
        <div
          className="pulse-sheet-backdrop"
          onClick={() => !paymentBusy && setPaymentPrompt(null)}
          role="presentation"
        >
          <div
            className="pulse-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Pay ${paymentPrompt.amount} WLD`}
          >
            <div className="pulse-sheet-handle" />
            <div className="pulse-sheet-header">
              <div>
                <span className="pulse-sheet-kicker">Confirm payment</span>
                <strong className="pulse-sheet-title">{paymentPrompt.title}</strong>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "rgba(232,234,246,0.72)" }}>
              {paymentPrompt.detail}
            </p>
            <div className="pulse-payout-box">
              <div className="pulse-payout-row">
                <span>Amount</span>
                <strong className="pulse-payout-highlight">{paymentPrompt.amount} WLD</strong>
              </div>
              <div className="pulse-payout-row">
                <span>Network</span>
                <strong>World Chain</strong>
              </div>
              <div className="pulse-payout-row">
                <span>Fee</span>
                <strong>0.3%</strong>
              </div>
            </div>
            <button
              className="pulse-confirm-btn yes"
              disabled={paymentBusy}
              onClick={confirmPayment}
              type="button"
            >
              {paymentBusy ? "Confirming…" : `Pay ${paymentPrompt.amount} WLD`}
            </button>
            <button
              className="pulse-goal-cancel-btn"
              disabled={paymentBusy}
              onClick={() => setPaymentPrompt(null)}
              style={{ width: "100%", marginTop: 8 }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      {toast && (
        <div className="pulse-toast" role="status" aria-live="polite">
          <strong>{toast.title}</strong>
          <span>{toast.detail}</span>
          <button onClick={() => setToast(null)} type="button" aria-label="Dismiss">✕</button>
        </div>
      )}
    </div>
  );
}
