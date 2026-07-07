-- VeRdex — Multi-pick Combo Bets
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New Query)
-- Combo bets let a human stake WLD across 2–5 markets simultaneously.
-- The combo wins only if ALL picks resolve correctly.

CREATE TABLE IF NOT EXISTS verdex_combos (
  id               TEXT PRIMARY KEY,
  world_nullifier  TEXT NOT NULL,
  username         TEXT,
  picks            JSONB NOT NULL,                     -- Array of ComboPick objects
  stake_wld        NUMERIC(12,4) NOT NULL CHECK (stake_wld > 0 AND stake_wld <= 100),
  total_odds       NUMERIC(10,4) NOT NULL CHECK (total_odds > 1),
  projected_payout NUMERIC(12,4) NOT NULL CHECK (projected_payout > 0),
  tx_reference     TEXT,
  status           TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','won','lost','partial','void')),
  placed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at       TIMESTAMPTZ,
  payout_wld       NUMERIC(12,4),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verdex_combos_nullifier ON verdex_combos(world_nullifier);
CREATE INDEX IF NOT EXISTS idx_verdex_combos_status    ON verdex_combos(status);
CREATE INDEX IF NOT EXISTS idx_verdex_combos_placed    ON verdex_combos(placed_at DESC);

-- Service-role only — combos are read through the API, never directly by anon
ALTER TABLE verdex_combos ENABLE ROW LEVEL SECURITY;

-- Explicit deny: anon users cannot read, insert, or modify combo bets
CREATE POLICY "deny anon combos" ON verdex_combos FOR ALL TO anon USING (false);
