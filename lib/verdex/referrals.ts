// ── Referral system (server-side) ─────────────────────────────────────────────
// One referrer per invited human, forever. The reward (real WLD via the
// treasury rail) only fires after the invitee places their FIRST confirmed
// bet — so a reward always means a real verified human who actually played.

import { createClient } from "@supabase/supabase-js";
import { queuePayouts } from "./payouts";

export const REFERRAL_REWARD_WLD = 0.2;

function getDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function isWallet(a: string) { return /^0x[a-fA-F0-9]{40}$/.test(a); }

export async function recordReferral(referrer: string, referee: string): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  if (!db) return { ok: false, error: "Database not configured." };
  if (!isWallet(referrer) || !isWallet(referee)) return { ok: false, error: "Invalid wallet address." };
  if (referrer.toLowerCase() === referee.toLowerCase()) return { ok: false, error: "You cannot refer yourself." };

  // Only genuinely new humans count — anyone who already bet is not a referral
  const { count } = await db
    .from("verdex_bets")
    .select("id", { count: "exact", head: true })
    .eq("world_nullifier", referee)
    .eq("confirmed", true);
  if ((count ?? 0) > 0) return { ok: false, error: "Not a new user." };

  const { error } = await db.from("verdex_referrals").insert({
    referee_nullifier: referee,
    referrer_nullifier: referrer,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Already referred." };
    console.error("[verdex/referrals] record:", error.message);
    return { ok: false, error: "Failed to record referral." };
  }
  return { ok: true };
}

// Called after every successful bet — pays the referrer once, on the
// invitee's first confirmed bet.
export async function maybeRewardReferral(referee: string): Promise<void> {
  const db = getDb();
  if (!db || !isWallet(referee)) return;

  const { data: ref } = await db
    .from("verdex_referrals")
    .select("referrer_nullifier, rewarded, reward_wld")
    .eq("referee_nullifier", referee)
    .single();
  if (!ref || ref.rewarded) return;

  // Claim the reward row atomically so two simultaneous bets can't double-pay
  const { data: claimed } = await db
    .from("verdex_referrals")
    .update({ rewarded: true })
    .eq("referee_nullifier", referee)
    .eq("rewarded", false)
    .select("referee_nullifier");
  if (!claimed || claimed.length === 0) return;

  await queuePayouts([{
    source: "referral",
    sourceId: `ref-${referee.toLowerCase()}`,
    worldNullifier: ref.referrer_nullifier,
    amountWld: Number(ref.reward_wld) || REFERRAL_REWARD_WLD,
  }]);
}

export async function getReferralStats(nullifier: string): Promise<{ invited: number; rewarded: number; earnedWld: number } | null> {
  const db = getDb();
  if (!db || !isWallet(nullifier)) return null;

  const { data, error } = await db
    .from("verdex_referrals")
    .select("rewarded, reward_wld")
    .eq("referrer_nullifier", nullifier);
  if (error) return null;

  const rows = (data ?? []) as Array<{ rewarded: boolean; reward_wld: number }>;
  const rewarded = rows.filter((r) => r.rewarded);
  return {
    invited: rows.length,
    rewarded: rewarded.length,
    earnedWld: Math.round(rewarded.reduce((s, r) => s + Number(r.reward_wld), 0) * 10000) / 10000,
  };
}
