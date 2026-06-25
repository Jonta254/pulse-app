"use client";

import { MiniKit } from "@worldcoin/minikit-js";
import { Permission, Tokens, tokenToDecimals } from "@worldcoin/minikit-js/commands";
import type { PayResult } from "@worldcoin/minikit-js/commands";
import { getWorldAppId, getVerdexTreasury } from "./worldConfig";

export { Permission };

export function isWorldReady(): boolean {
  return typeof window !== "undefined" && MiniKit.isInstalled();
}

// Read value from MiniKit (handles SDK version quirks)
function readMKValue<T>(key: string): T | undefined {
  if (typeof window !== "undefined") {
    const wMK = (window as unknown as { MiniKit?: Record<string, T | undefined> }).MiniKit;
    if (wMK?.[key] !== undefined && wMK?.[key] !== null) return wMK[key];
  }
  return (MiniKit as unknown as Record<string, T | undefined>)[key];
}

export function getWorldContext() {
  const rawApp = typeof window !== "undefined"
    ? (window as unknown as { WorldApp?: Record<string, unknown> }).WorldApp
    : undefined;
  const user = readMKValue<Record<string, unknown> | null>("user");
  const deviceProps = readMKValue<{ deviceOS?: string; safeAreaInsets?: { top: number; bottom: number; left: number; right: number } } | null>("deviceProperties");
  return {
    deviceOS: deviceProps?.deviceOS ?? String(rawApp?.device_os ?? ""),
    safeAreaInsets: deviceProps?.safeAreaInsets ?? (rawApp?.safe_area_insets as { top: number; bottom: number; left: number; right: number } | undefined),
    username: String(user?.username ?? rawApp?.username ?? ""),
    walletAddress: String(user?.walletAddress ?? user?.wallet_address ?? rawApp?.wallet_address ?? ""),
  };
}

// ── MiniKit user type (per World Developer docs) ─────────────────────────────
// Docs: "After Wallet Auth, username and profilePictureUrl are accessible
// directly through MiniKit.user without additional method calls."
type MiniKitUser = {
  walletAddress?: string;
  username?: string;
  profilePictureUrl?: string;
};

export type WorldAuthResult =
  | { ok: true;  address: string; username: string; profilePictureUrl?: string }
  | { ok: false; error: string };

export async function authenticateWithWorld(): Promise<WorldAuthResult> {
  if (!isWorldReady()) return { ok: false, error: "Open inside World App." };

  // 1. Get a fresh nonce from our backend
  const r = await fetch("/api/world/nonce");
  const { nonce } = await r.json() as { nonce: string };

  // 2. Trigger MiniKit walletAuth (SIWE)
  // Docs: after this completes, MiniKit.user is populated with username + profilePictureUrl
  const result = await MiniKit.walletAuth({
    expirationTime: new Date(Date.now() + 600_000),
    nonce,
    statement: "Sign in to VeRdex — Human Prediction Network.",
  });

  if (result.executedWith !== "minikit") {
    return { ok: false, error: "Open VeRdex inside World App to sign in." };
  }

  // 3. Verify SIWE payload on backend (docs: always verify server-side)
  const verify = await fetch("/api/world/complete-siwe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nonce, payload: result.data }),
  });

  if (!verify.ok) {
    const e = await verify.json() as { error?: string };
    return { ok: false, error: e.error ?? "Verification failed." };
  }

  const data = await verify.json() as { ok: boolean; address: string };
  if (!data.ok) return { ok: false, error: "Backend verification rejected." };

  const address = data.address ?? result.data.address;

  // 4. Read username + profile picture from MiniKit.user
  // Docs: "MiniKit.user.username is available after Wallet Auth"
  // Primary: MiniKit.user (populated by SDK after walletAuth)
  const mkUser = (MiniKit as unknown as { user?: MiniKitUser }).user;

  let username  = mkUser?.username ?? "";
  let profilePictureUrl = mkUser?.profilePictureUrl;

  // 5. Fallback: explicit getUserByAddress if MiniKit.user wasn't populated
  // Docs: "await MiniKit.getUserByAddress(userAddress)" as alternative
  if (!username && address) {
    try {
      const fetched = await (MiniKit as unknown as {
        getUserByAddress: (addr: string) => Promise<MiniKitUser>
      }).getUserByAddress(address);
      username         = fetched?.username ?? "";
      profilePictureUrl = fetched?.profilePictureUrl ?? profilePictureUrl;
    } catch {
      // getUserByAddress failed — we'll use the address-based display name
    }
  }

  // 6. Final fallback display name: @0x1234…abcd
  const displayUsername = username
    ? `@${username}`
    : `@${address.slice(0, 6)}…${address.slice(-4)}`;

  return { ok: true, address, username: displayUsername, profilePictureUrl };
}

// Fast confirmation budget. MiniKit success already means the user approved and
// the tx was broadcast on World Chain (funds have left the wallet), so we only
// poll the dev-portal indexer briefly (~6s) for an on-chain "mined" before falling
// back to optimistic success. Keeps the bet button from hanging on indexer lag.
const CONFIRM_DELAYS = [0, 1200, 2400, 3600];

export async function payWithWorld({ amount, description, feature = "tip-verdex" }: { amount: number; description: string; feature?: string }) {
  const treasury = getVerdexTreasury();
  if (!treasury) return { ok: false, pendingSetup: true, message: "Treasury wallet not configured." };
  if (!isWorldReady()) return { ok: false, pendingWorldApp: true, message: "Open inside World App." };

  const refRes = await fetch("/api/world/payment-reference", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, feature, token: "WLD" }),
  });
  const { reference, error: refErr } = await refRes.json() as { reference?: string; error?: string };
  if (!refRes.ok || !reference) return { ok: false, error: refErr ?? "Could not prepare payment." };

  const payment = await MiniKit.pay({
    reference, to: treasury,
    tokens: [{ symbol: Tokens.WLD, token_amount: tokenToDecimals(amount, Tokens.WLD).toString() }],
    description,
    fallback: () => ({ transactionId: "preview", reference, from: "preview", chain: "worldchain" as PayResult["chain"], timestamp: new Date().toISOString() }),
  }).catch((e) => ({ error: e instanceof Error ? e.message : "Payment failed.", executedWith: "error" as const }));

  if (payment.executedWith === "error") return { ok: false, error: (payment as { error: string }).error };
  if (payment.executedWith === "fallback") return { ok: false, pendingWorldApp: true, message: "Complete payment inside World App." };
  // Docs: only trust payment data when SDK confirms execution through minikit
  if (payment.executedWith !== "minikit") return { ok: false, error: "Payment not completed via World App." };

  const data = (payment as { data: PayResult }).data;
  let last: Record<string, unknown> | null = null;
  for (const delay of CONFIRM_DELAYS) {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    try {
      const c = await fetch("/api/world/confirm-payment", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: data, reference, feature, amount, token: "WLD" }),
      });
      const conf = await c.json() as Record<string, unknown>;
      last = conf;
      // Only abort on a genuine fraud/validation mismatch — never on transient
      // lookup/indexer errors (those return { pending: true } and we retry).
      if (!c.ok) return { ok: false, error: String(conf.error ?? "Payment confirmation failed.") };
      if (conf.pendingSetup) return { ok: false, pendingSetup: true };
      if (conf.ok) return { ok: true, reference };
    } catch { /* retry */ }
  }
  // Not yet mined after the fast budget. The World App payment already succeeded
  // (funds left the wallet), so record the bet optimistically instead of blocking.
  if (data?.transactionId) return { ok: true, reference, optimistic: true };
  return { ok: false, error: String(last?.error ?? "Payment still pending.") };
}

export async function shareWithWorld(opts: { title: string; text: string; url: string }) {
  if (!isWorldReady()) {
    if (navigator.clipboard) await navigator.clipboard.writeText(opts.url);
    return;
  }
  await MiniKit.share({
    ...opts,
    fallback: async () => {
      if (navigator.share) await navigator.share(opts);
      return { shared_files_count: 0, status: "success", version: 1, timestamp: new Date().toISOString() };
    },
  });
}

// ── Haptic feedback helpers (docs: sendHapticFeedback) ───────────────────────
export async function hapticSuccess() {
  if (!isWorldReady()) return;
  try { await MiniKit.sendHapticFeedback({ hapticsType: "notification", style: "success" }); } catch { /* ignore */ }
}

export async function hapticError() {
  if (!isWorldReady()) return;
  try { await MiniKit.sendHapticFeedback({ hapticsType: "notification", style: "error" }); } catch { /* ignore */ }
}

export async function hapticImpact() {
  if (!isWorldReady()) return;
  try { await MiniKit.sendHapticFeedback({ hapticsType: "impact", style: "medium" }); } catch { /* ignore */ }
}

export async function hapticSelection() {
  if (!isWorldReady()) return;
  try { await MiniKit.sendHapticFeedback({ hapticsType: "selection-changed" }); } catch { /* ignore */ }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isWorldReady()) return false;
  try {
    const result = await MiniKit.requestPermission({
      permission: Permission.Notifications,
      fallback: () => ({ permission: Permission.Notifications, status: "success", version: 1, timestamp: new Date().toISOString() }),
    });
    return result?.executedWith === "minikit" && (result as unknown as { data?: { status?: string } }).data?.status === "granted";
  } catch { return false; }
}
