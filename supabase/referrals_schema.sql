-- VeRdex — Referral system
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New Query)
-- Referrers earn real WLD (via the treasury rail) when an invited verified
-- human places their first confirmed bet.

CREATE TABLE IF NOT EXISTS verdex_referrals (
  referee_nullifier  TEXT PRIMARY KEY,          -- the invited human (one referrer max, forever)
  referrer_nullifier TEXT NOT NULL,
  rewarded           BOOLEAN NOT NULL DEFAULT false,
  reward_wld         NUMERIC(8,4) NOT NULL DEFAULT 0.2,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verdex_referrals_referrer ON verdex_referrals(referrer_nullifier);
ALTER TABLE verdex_referrals ENABLE ROW LEVEL SECURITY;

-- Allow the payouts rail to carry referral rewards
ALTER TABLE verdex_payouts DROP CONSTRAINT IF EXISTS verdex_payouts_source_check;
ALTER TABLE verdex_payouts ADD CONSTRAINT verdex_payouts_source_check
  CHECK (source IN ('market','clash','goal','referral'));
