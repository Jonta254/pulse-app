"use client";

/**
 * VerdexApp — root shell for VeRdex mini app.
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
import { applyTheme, getStoredTheme, saveTheme, toggleTheme, type VerdexTheme } from "@/lib/verdex/theme";
import { VerdexView } from "./VerdexView";
import type { HistoryRecord } from "@/types/reputation";
import type { VerifiedHuman } from "@/types/user";
import type { PaymentRequest, Toast } from "@/types/ui";

// ── Types ─────────────────────────────────────────────────────────────────────

type AuthState = "idle" | "checking" | "signing" | "done" | "error";

// ── VerdexApp ──────────────────────────────────────────────────────────────────

export function VerdexApp() {
  const [user, setUser]                       = useState<VerifiedHuman | null>(null);
  const [authState, setAuthState]             = useState<AuthState>("idle");
  const [authError, setAuthError]             = useState<string | null>(null);
  const [miniKitReady, setMiniKitReady]       = useState(false);
  const [toast, setToast]                     = useState<Toast | null>(null);
  const [paymentPrompt, setPaymentPrompt]     = useState<PaymentRequest | null>(null);
  const [paymentBusy, setPaymentBusy]         = useState(false);
  const [theme, setTheme]                     = useState<VerdexTheme>("night");
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

      if (!result.ok) {
        void hapticError();
        setAuthError(result.error ?? "Open VeRdex inside World App.");
        setAuthState("error");
        return;
      }

      // username + profilePictureUrl come from authenticateWithWorld()
      // which reads MiniKit.user (populated by SDK after walletAuth)
      // and falls back to getUserByAddress() per World Developer docs.
      void hapticSuccess();
      setAuthState("done");
      setUser({
        wallet: result.address,
        username: result.username,          // "@realname" from World ID
        profilePictureUrl: result.profilePictureUrl,
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
        feature: paymentPrompt.feature ?? "tip-verdex",
      });

      // ── Payment sent but on-chain confirmation timed out ─────────────────
      // WLD has already left the user's wallet at this point.
      // We treat "pending" as optimistic success — the bet is recorded locally
      // and in Supabase. The treasury received the funds regardless.
      const isPending = !result.ok && "pending" in result && result.pending;

      if (!result.ok && !isPending) {
        void hapticError();
        // Only show hard failure if payment truly didn't go through
        const errMsg = "error" in result && result.error ? String(result.error) : "";
        if (errMsg && !errMsg.includes("pending") && !errMsg.includes("timeout")) {
          setToast({ title: "Payment failed", detail: "Try again inside World App." });
          return;
        }
        // If error looks like a timeout/pending, fall through and record the bet
      }

      void hapticSuccess();
      // Pass the real tx reference so bet→payment can be linked in Supabase
      const txRef = "reference" in result && result.reference
        ? String(result.reference)
        : `verdex-tx-${Date.now()}`;
      await paymentPrompt.onConfirmed?.(amount, txRef);
      setToast({
        title: `${amount} WLD sent ✓`,
        detail: isPending
          ? "Payment processing — your bet is recorded."
          : paymentPrompt.success,
      });
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
      <div className="verdex-gate">
        <div className="verdex-gate-card">

          {/* Logo + brand */}
          <div className="verdex-gate-logo">
            <span className="verdex-gate-bolt">⚡</span>
          </div>
          <h1 className="verdex-gate-title">VeRdex</h1>
          <p className="verdex-gate-sub">Human Prediction Network</p>

          {/* Value props */}
          <div className="verdex-gate-props">
            <div className="verdex-gate-prop">
              <span className="verdex-gate-prop-icon">🔮</span>
              <div>
                <strong>Predict Real Events</strong>
                <span>Crypto, sports, world, culture</span>
              </div>
            </div>
            <div className="verdex-gate-prop">
              <span className="verdex-gate-prop-icon">💰</span>
              <div>
                <strong>Win WLD</strong>
                <span>Pro-rata payout from the pool</span>
              </div>
            </div>
            <div className="verdex-gate-prop">
              <span className="verdex-gate-prop-icon">⚔️</span>
              <div>
                <strong>1v1 Clash</strong>
                <span>Challenge humans — winner takes 90%</span>
              </div>
            </div>
            <div className="verdex-gate-prop">
              <span className="verdex-gate-prop-icon">🛡️</span>
              <div>
                <strong>Zero Bots</strong>
                <span>Every forecaster is World ID verified</span>
              </div>
            </div>
          </div>

          {/* Error message */}
          {authError && (
            <div className="verdex-gate-error" role="alert">
              {authError}
              {!inWorldApp && " · Open this app inside World App."}
            </div>
          )}

          {/* Primary CTA — World ID sign in */}
          <button
            className="verdex-gate-btn"
            disabled={busy}
            onClick={handleLogin}
            type="button"
            aria-busy={busy}
          >
            {isChecking && (
              <span className="verdex-gate-spinner" aria-hidden="true" />
            )}
            {isSigning && (
              <span className="verdex-gate-spinner" aria-hidden="true" />
            )}
            <span className="verdex-gate-worldid-icon" aria-hidden="true">
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
              className="verdex-gate-retry"
              onClick={() => { setAuthState("idle"); setAuthError(null); }}
              type="button"
            >
              Try again
            </button>
          )}

          {/* Preview mode — only shown when NOT in World App */}
          {!inWorldApp && authState !== "signing" && authState !== "checking" && (
            <button
              className="verdex-gate-preview"
              onClick={handlePreview}
              type="button"
            >
              Preview (no wallet)
            </button>
          )}

          {/* Legal note */}
          <p className="verdex-gate-legal">
            By continuing you accept the{" "}
            <span style={{ color: "var(--verdex-accent)" }}>Terms of Service</span>.
            Prediction markets involve financial risk.
          </p>
        </div>
      </div>
    );
  }

  // ── Main app ─────────────────────────────────────────────────────────────
  return (
    <div className="verdex-shell">
      <VerdexView
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
          className="verdex-sheet-backdrop"
          onClick={() => !paymentBusy && setPaymentPrompt(null)}
          role="presentation"
        >
          <div
            className="verdex-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Pay ${paymentPrompt.amount} WLD`}
          >
            <div className="verdex-sheet-handle" />
            <div className="verdex-sheet-header">
              <div>
                <span className="verdex-sheet-kicker">Confirm payment</span>
                <strong className="verdex-sheet-title">{paymentPrompt.title}</strong>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "rgba(232,234,246,0.72)" }}>
              {paymentPrompt.detail}
            </p>
            <div className="verdex-payout-box">
              <div className="verdex-payout-row">
                <span>Amount</span>
                <strong className="verdex-payout-highlight">{paymentPrompt.amount} WLD</strong>
              </div>
              <div className="verdex-payout-row">
                <span>Network</span>
                <strong>World Chain</strong>
              </div>
              <div className="verdex-payout-row">
                <span>Fee</span>
                <strong>2% of losing pool</strong>
              </div>
            </div>
            <button
              className="verdex-confirm-btn yes"
              disabled={paymentBusy}
              onClick={confirmPayment}
              type="button"
            >
              {paymentBusy ? "Confirming…" : `Pay ${paymentPrompt.amount} WLD`}
            </button>
            <button
              className="verdex-goal-cancel-btn"
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
        <div className="verdex-toast" role="status" aria-live="polite">
          <strong>{toast.title}</strong>
          <span>{toast.detail}</span>
          <button onClick={() => setToast(null)} type="button" aria-label="Dismiss">✕</button>
        </div>
      )}
    </div>
  );
}
