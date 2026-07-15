// ── Payout queue (Supabase, service-role only) ───────────────────────────────
// Settlement queues rows here; the processor / claim flow sends real WLD and
// records processing → paid/failed with tx hash, attempts, and errors.

import { createClient } from "@supabase/supabase-js";
import { getTreasuryStatus, getTreasuryWarnings, isTreasuryPayoutEnabled, sendWldFromTreasury, treasuryDisabledReason } from "./treasury";

const MAX_ATTEMPTS = 3;

function getDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function isWallet(addr: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

export type PayoutQueueEntry = {
  source: "market" | "clash" | "goal" | "referral";
  sourceId: string;
  marketId?: string;
  worldNullifier: string;
  username?: string | null;
  amountWld: number;
};

export type PayoutRow = {
  id: string;
  source: string;
  source_id: string;
  market_id: string | null;
  world_nullifier: string;
  username: string | null;
  wallet_address: string | null;
  amount_wld: number;
  status: string;
  tx_hash: string | null;
  attempts: number;
  last_error: string | null;
  created_at: string;
  paid_at: string | null;
};

// Queue payouts at settlement. The bettor's nullifier IS their SIWE-verified
// wallet address, so funds can only ever go to the wallet that placed the bet.
export async function queuePayouts(entries: PayoutQueueEntry[]): Promise<number> {
  const db = getDb();
  if (!db || entries.length === 0) return 0;

  const rows = entries
    .filter((e) => e.amountWld > 0)
    .map((e) => ({
      source: e.source,
      source_id: e.sourceId,
      market_id: e.marketId ?? null,
      world_nullifier: e.worldNullifier,
      username: e.username ?? null,
      wallet_address: isWallet(e.worldNullifier) ? e.worldNullifier : null,
      amount_wld: Math.round(e.amountWld * 10000) / 10000,
      status: isWallet(e.worldNullifier) ? "queued" : "awaiting_wallet",
    }));

  if (rows.length === 0) return 0;

  const { error, data } = await db
    .from("verdex_payouts")
    .upsert(rows, { onConflict: "source,source_id", ignoreDuplicates: true })
    .select("id");

  if (error) { console.error("[verdex/payouts] queuePayouts:", error.message); return 0; }
  return data?.length ?? rows.length;
}

export async function getPayouts(opts: { nullifier?: string; status?: string; limit?: number }): Promise<PayoutRow[] | null> {
  const db = getDb();
  if (!db) return null;

  let query = db
    .from("verdex_payouts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(opts.limit ?? 100, 200));

  if (opts.nullifier) query = query.eq("world_nullifier", opts.nullifier);
  if (opts.status) query = query.eq("status", opts.status);

  const { data, error } = await query;
  if (error) { console.error("[verdex/payouts] getPayouts:", error.message); return null; }
  return data as PayoutRow[];
}

export type ProcessSummary = {
  ok: boolean;
  enabled: boolean;
  processed: number;
  paid: number;
  failed: number;
  skipped: number;
  paidWallets: string[];
  treasury?: { address: string; wldBalance: number; ethBalance: number };
  warnings?: string[];
  results: Array<{ id: string; status: string; txHash?: string; error?: string }>;
  error?: string;
};

// Send queued WLD payouts from the treasury. Each row is atomically moved
// queued → processing (guarded by .eq status) so concurrent runs never
// double-send the same payout.
export async function processQueuedPayouts(opts: { nullifier?: string; limit?: number; retryFailed?: boolean } = {}): Promise<ProcessSummary> {
  const base: ProcessSummary = { ok: false, enabled: isTreasuryPayoutEnabled(), processed: 0, paid: 0, failed: 0, skipped: 0, paidWallets: [], results: [] };
  const db = getDb();
  if (!db) return { ...base, error: "Database not configured." };

  if (!base.enabled) {
    return { ...base, error: `Treasury payouts disabled: ${treasuryDisabledReason()}` };
  }

  const limit = Math.min(opts.limit ?? 20, 50);
  const statuses = opts.retryFailed ? ["queued", "failed"] : ["queued"];

  let query = db
    .from("verdex_payouts")
    .select("*")
    .in("status", statuses)
    .not("wallet_address", "is", null)
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (opts.nullifier) query = query.eq("world_nullifier", opts.nullifier);

  const { data: rows, error } = await query;
  if (error) return { ...base, error: `Failed to fetch queue: ${error.message}` };
  if (!rows || rows.length === 0) return { ...base, ok: true };

  // Treasury must cover the whole batch in WLD and hold ETH for gas
  const treasury = await getTreasuryStatus();
  if (!treasury) return { ...base, error: "Treasury signer not configured." };
  base.treasury = treasury;

  // Proactive warning, logged on every real payout run — well before the hard
  // gas/WLD floors below actually block a batch, so there's lead time to top up.
  const warnings = getTreasuryWarnings(treasury);
  if (warnings.length > 0) {
    console.warn(`[verdex/treasury] ${warnings.join(" | ")}`);
    base.warnings = warnings;
  }

  const totalDue = (rows as PayoutRow[]).reduce((s, r) => s + Number(r.amount_wld), 0);
  if (treasury.wldBalance < totalDue) {
    return { ...base, error: `Insufficient treasury WLD: have ${treasury.wldBalance.toFixed(4)}, need ${totalDue.toFixed(4)}.` };
  }
  // Need at least 0.001 ETH — covers ~10 ERC-20 transfer gas fees on World Chain
  if (treasury.ethBalance < 0.001) {
    return { ...base, error: `Treasury ETH too low for gas: ${treasury.ethBalance.toFixed(6)} ETH (need ≥ 0.001).` };
  }

  for (const row of rows as PayoutRow[]) {
    // Claim the row: only proceed if it is still in its fetched status
    const { data: claimed } = await db
      .from("verdex_payouts")
      .update({ status: "processing", attempts: row.attempts + 1, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", row.status)
      .select("id");

    if (!claimed || claimed.length === 0) { base.skipped++; continue; }
    base.processed++;

    const result = await sendWldFromTreasury(row.wallet_address as string, Number(row.amount_wld));

    if (result.ok) {
      await db.from("verdex_payouts").update({
        status: "paid",
        tx_hash: result.txHash,
        last_error: null,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", row.id);
      base.paid++;
      base.paidWallets.push(row.wallet_address as string);
      base.results.push({ id: row.id, status: "paid", txHash: result.txHash });
    } else {
      const exhausted = row.attempts + 1 >= MAX_ATTEMPTS;
      await db.from("verdex_payouts").update({
        status: exhausted ? "failed" : "queued",
        last_error: result.error.slice(0, 500),
        updated_at: new Date().toISOString(),
      }).eq("id", row.id);
      base.failed++;
      base.results.push({ id: row.id, status: exhausted ? "failed" : "queued", error: result.error });
    }
  }

  base.ok = true;
  return base;
}

// Fire-and-forget "payout sent" / "stake refunded" push notification
export async function notifyPaidWinners(wallets: string[], event: "paid" | "refund" = "paid") {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const secret = process.env.CRON_SECRET ?? "";
  if (!appUrl || wallets.length === 0) return;
  fetch(`${appUrl}/api/verdex/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ payoutEvent: event, nullifiers: wallets }),
  }).catch(() => null);
}
