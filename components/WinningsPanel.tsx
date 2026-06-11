"use client";

import { useCallback, useEffect, useState } from "react";
import { Wallet, ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import { hapticSuccess, hapticError } from "@/lib/world";

type PayoutItem = {
  id: string;
  source: string;
  marketId: string | null;
  amountWld: number;
  status: string;
  txHash: string | null;
  createdAt: string;
  paidAt: string | null;
};

type ClaimResponse = {
  ok: boolean;
  claimed: number;
  failed?: number;
  pending?: number;
  totalWld?: number;
  message?: string;
  error?: string;
};

// Treasury winnings — shows queued/paid WLD payouts for the signed-in wallet
// and lets winners claim instantly instead of waiting for the next cron run.
export function WinningsPanel({ wallet }: { wallet: string | null }) {
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const isRealWallet = Boolean(wallet && /^0x[a-fA-F0-9]{40}$/.test(wallet));

  const refresh = useCallback(async () => {
    if (!isRealWallet) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/predictions/payouts?nullifier=${wallet}`, { cache: "no-store" });
      const data = await res.json() as { ok: boolean; payouts?: PayoutItem[] };
      if (data.ok && data.payouts) setPayouts(data.payouts);
    } catch { /* keep previous state */ }
    setLoading(false);
  }, [wallet, isRealWallet]);

  useEffect(() => { void refresh(); }, [refresh]);

  if (!isRealWallet) return null;

  const queued = payouts.filter((p) => p.status === "queued" || p.status === "processing");
  const paid = payouts.filter((p) => p.status === "paid");
  const claimable = Math.round(queued.reduce((s, p) => s + p.amountWld, 0) * 10000) / 10000;

  if (payouts.length === 0 && !loading) return null;

  async function handleClaim() {
    if (claiming || claimable <= 0) return;
    setClaiming(true);
    setNotice(null);
    try {
      const res = await fetch("/api/predictions/payouts/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nullifier: wallet }),
      });
      const data = await res.json() as ClaimResponse;
      if (data.claimed > 0) {
        await hapticSuccess();
        setNotice(`🎉 ${data.claimed} payout${data.claimed > 1 ? "s" : ""} sent to your wallet on World Chain!`);
      } else if (data.message) {
        setNotice(data.message);
      } else if (data.error) {
        await hapticError();
        setNotice(data.error);
      }
    } catch {
      await hapticError();
      setNotice("Claim failed — please try again.");
    }
    setClaiming(false);
    void refresh();
  }

  return (
    <div className="verdex-winnings">
      <div className="verdex-winnings-head">
        <div className="verdex-winnings-title">
          <Sparkles size={15} />
          <strong>Treasury Winnings</strong>
        </div>
        <button type="button" className="verdex-winnings-refresh" onClick={() => void refresh()} aria-label="Refresh winnings">
          <RefreshCw size={13} className={loading ? "verdex-spin" : undefined} />
        </button>
      </div>

      {claimable > 0 ? (
        <>
          <div className="verdex-winnings-amount">
            <span>Claimable now</span>
            <strong>{claimable.toFixed(4)} WLD</strong>
          </div>
          <button type="button" className="verdex-cta-btn verdex-winnings-claim" onClick={() => void handleClaim()} disabled={claiming}>
            <Wallet size={15} />
            {claiming ? "Sending to your wallet…" : "Claim to my World App wallet"}
          </button>
          <p className="verdex-winnings-hint">
            Sent as real WLD on World Chain to the same wallet you bet with. No fees, no forms.
          </p>
        </>
      ) : (
        <p className="verdex-winnings-hint">All winnings paid out. New wins appear here the moment markets resolve.</p>
      )}

      {notice && <div className="verdex-mybet-note won" style={{ marginTop: 8 }}>{notice}</div>}

      {paid.length > 0 && (
        <div className="verdex-winnings-paidlist">
          {paid.slice(0, 5).map((p) => (
            <a
              key={p.id}
              className="verdex-winnings-paid"
              href={p.txHash ? `https://worldscan.org/tx/${p.txHash}` : undefined}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>✓ {p.amountWld.toFixed(4)} WLD paid{p.paidAt ? ` · ${new Date(p.paidAt).toLocaleDateString()}` : ""}</span>
              {p.txHash && <ExternalLink size={12} />}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
