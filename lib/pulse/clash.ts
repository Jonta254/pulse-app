"use client";

import { loadJsonFromStorage, saveJsonToStorage } from "@/lib/storage";
import type { PulseClash, PulseCopyFollow } from "@/types/pulse";

const STORAGE_CLASHES = "pulse_clashes_v1";
const STORAGE_FOLLOWS = "pulse_copy_follows_v1";

// ── Local clash storage ───────────────────────────────────────────────────────

export function loadLocalClashes(): PulseClash[] {
  return loadJsonFromStorage<PulseClash[]>(STORAGE_CLASHES, []);
}

export function saveLocalClashes(clashes: PulseClash[]) {
  saveJsonToStorage(STORAGE_CLASHES, clashes.slice(0, 50));
}

export function upsertLocalClash(clash: PulseClash) {
  const clashes = loadLocalClashes();
  const idx = clashes.findIndex((c) => c.id === clash.id);
  if (idx >= 0) clashes[idx] = clash;
  else clashes.unshift(clash);
  saveLocalClashes(clashes);
}

// ── Copy follows ──────────────────────────────────────────────────────────────

export function loadCopyFollows(): PulseCopyFollow[] {
  return loadJsonFromStorage<PulseCopyFollow[]>(STORAGE_FOLLOWS, []);
}

export function saveCopyFollows(follows: PulseCopyFollow[]) {
  saveJsonToStorage(STORAGE_FOLLOWS, follows);
}

export function isFollowing(leaderNullifier: string): boolean {
  return loadCopyFollows().some((f) => f.leaderNullifier === leaderNullifier);
}

export function toggleFollow(leader: { nullifier: string; username: string }): boolean {
  const follows = loadCopyFollows();
  const idx = follows.findIndex((f) => f.leaderNullifier === leader.nullifier);
  if (idx >= 0) {
    follows.splice(idx, 1);
    saveCopyFollows(follows);
    return false; // now unfollowed
  }
  follows.unshift({
    leaderNullifier: leader.nullifier,
    leaderUsername: leader.username,
    copyFraction: 0.1,
    since: new Date().toISOString(),
  });
  saveCopyFollows(follows);
  return true; // now following
}

// ── Share URL ─────────────────────────────────────────────────────────────────

// Returns both a World App deep link and a fallback web URL.
// World App opens mini apps via worldapp://mini-app?app_id=APP_ID&path=ENCODED_PATH
export function getClashShareUrl(clashId: string): { worldLink: string; webLink: string } {
  const appId = typeof window !== "undefined"
    ? (document.querySelector("meta[name='world-app-id']")?.getAttribute("content") ?? "")
    : "";
  const path = encodeURIComponent(`/?pulse_clash=${clashId}`);
  const worldLink = appId
    ? `worldapp://mini-app?app_id=${appId}&path=${path}`
    : `worldapp://mini-app?path=${path}`;

  const base = typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL ?? "https://humanchain.vercel.app");
  const webLink = `${base}/?pulse_clash=${clashId}`;

  return { worldLink, webLink };
}

export function readClashIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("pulse_clash");
}

// ── Clash status helpers ──────────────────────────────────────────────────────

export function clashStatusLabel(clash: PulseClash, myNullifier: string): string {
  if (clash.status === "pending") return "⏳ Awaiting challenger";
  if (clash.status === "expired") return "🕐 Expired";
  if (clash.status === "resolved") {
    return clash.winnerNullifier === myNullifier ? "🏆 You won!" : "❌ You lost";
  }
  return "⚔️ Active";
}

export function clashOpponent(clash: PulseClash, myNullifier: string): string {
  if (clash.creatorNullifier === myNullifier) {
    return clash.challengerUsername ?? clash.challengerNullifier?.slice(0, 8) ?? "Awaiting…";
  }
  return clash.creatorUsername ?? clash.creatorNullifier.slice(0, 8);
}
