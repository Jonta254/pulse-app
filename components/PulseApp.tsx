"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { authenticateWithWorld, isWorldReady, payWithWorld } from "@/lib/world";
import { PulseView } from "./PulseView";
import type { HistoryRecord } from "@/types/reputation";
import type { VerifiedHuman } from "@/types/user";
import type { PaymentRequest, Toast } from "@/types/ui";

export function PulseApp() {
  const [user, setUser] = useState<VerifiedHuman | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [paymentPrompt, setPaymentPrompt] = useState<PaymentRequest | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [points, setPoints] = useState(0);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Safe area CSS
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--safe-top", "env(safe-area-inset-top, 0px)");
    root.style.setProperty("--safe-bottom", "env(safe-area-inset-bottom, 0px)");
  }, []);

  async function handleLogin() {
    setBusy(true);
    try {
      const result = await authenticateWithWorld();
      if (!result.ok || !result.address) {
        setToast({ title: "Login failed", detail: result.error ?? "Open inside World App." });
        return;
      }
      setUser({ wallet: result.address, username: "@world_human", mode: "world", lastSeenAt: new Date().toISOString() });
      setToast({ title: "Welcome to PULSE", detail: "Verified human. Start predicting." });
    } finally {
      setBusy(false);
    }
  }

  function handlePreview() {
    setUser({ wallet: "0xpreview", username: "@preview_human", mode: "preview", lastSeenAt: new Date().toISOString() });
  }

  function openPayment(payment: PaymentRequest) {
    if (!user || user.mode === "preview") {
      setToast({ title: "Verify with World ID first", detail: "Tap 'Continue with World' to enable WLD payments." });
      return;
    }
    setPaymentPrompt(payment);
  }

  async function confirmPayment() {
    if (!paymentPrompt || paymentBusy) return;
    const amount = parseFloat(paymentPrompt.amount);
    if (!amount || amount <= 0) return;
    setPaymentBusy(true);
    try {
      const result = await payWithWorld({ amount, description: paymentPrompt.detail, feature: paymentPrompt.feature ?? "tip-pulse" });
      if (!result.ok) {
        setToast({ title: "Payment failed", detail: "error" in result && result.error ? String(result.error) : "Try again inside World App." });
        return;
      }
      await paymentPrompt.onConfirmed?.(amount);
      setToast({ title: `${amount} WLD confirmed`, detail: paymentPrompt.success });
      setPaymentPrompt(null);
    } finally {
      setPaymentBusy(false);
    }
  }

  function earnPoints(amount: number, _reason: string) {
    setPoints((p) => p + amount);
  }

  function recordHistory(_record: Omit<HistoryRecord, "id" | "time">) {
    // localStorage history — no-op in minimal shell; extend as needed
  }

  if (!user) {
    return (
      <div className="pulse-gate">
        <div className="pulse-gate-card">
          <div className="pulse-gate-icon"><Zap size={40} /></div>
          <h1>PULSE</h1>
          <p>The Human Prediction Network. Every forecaster is a verified World ID human — zero bots, pure signal.</p>
          <div className="pulse-gate-pills">
            <span>⚡ YES/NO Markets</span>
            <span>⚔️ 1v1 Clash</span>
            <span>📋 Copy Betting</span>
            <span>🎯 Personal Goals</span>
          </div>
          <button className="pulse-gate-btn" disabled={busy} onClick={handleLogin} type="button">
            {busy ? "Verifying…" : "Continue with World"}
          </button>
          {!isWorldReady() && (
            <button className="pulse-gate-preview" onClick={handlePreview} type="button">
              Preview without World App
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pulse-shell">
      <PulseView
        humanIdentity={user}
        openPayment={openPayment}
        earnPoints={earnPoints}
        recordHistory={recordHistory}
      />

      {/* Payment confirmation sheet */}
      {paymentPrompt && (
        <div className="pulse-sheet-backdrop" onClick={() => !paymentBusy && setPaymentPrompt(null)} role="presentation">
          <div className="pulse-sheet" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="pulse-sheet-handle" />
            <div className="pulse-sheet-header">
              <div>
                <span className="pulse-sheet-kicker">Confirm payment</span>
                <strong className="pulse-sheet-title">{paymentPrompt.title}</strong>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "rgba(232,234,246,0.72)" }}>{paymentPrompt.detail}</p>
            <div className="pulse-payout-box">
              <div className="pulse-payout-row"><span>Amount</span><strong className="pulse-payout-highlight">{paymentPrompt.amount} WLD</strong></div>
              <div className="pulse-payout-row"><span>Network</span><strong>World Chain</strong></div>
            </div>
            <button className="pulse-confirm-btn yes" disabled={paymentBusy} onClick={confirmPayment} type="button">
              <Zap size={16} /> {paymentBusy ? "Confirming…" : `Pay ${paymentPrompt.amount} WLD`}
            </button>
            <button className="pulse-goal-cancel-btn" disabled={paymentBusy} onClick={() => setPaymentPrompt(null)} style={{ width: "100%" }} type="button">Cancel</button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="pulse-toast" role="status">
          <strong>{toast.title}</strong>
          <span>{toast.detail}</span>
          <button onClick={() => setToast(null)} type="button">✕</button>
        </div>
      )}
    </div>
  );
}
