-- VeRdex — Treasury payout rail
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New Query)
-- Queues winner payouts at settlement; /api/predictions/payouts/process sends
-- real WLD on World Chain from the treasury signer and records the tx hash.

CREATE TABLE IF NOT EXISTS verdex_payouts (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  source           TEXT NOT NULL DEFAULT 'market' CHECK (source IN ('market','clash','goal')),
  source_id        TEXT NOT NULL,             -- bet id / clash id / goal back id
  market_id        TEXT,
  world_nullifier  TEXT NOT NULL,             -- SIWE-verified wallet of the winner
  username         TEXT,
  wallet_address   TEXT,                      -- 0x… destination (same as nullifier when valid)
  amount_wld       NUMERIC(14,4) NOT NULL CHECK (amount_wld > 0),
  status           TEXT NOT NULL DEFAULT 'queued'
                   CHECK (status IN ('queued','awaiting_wallet','processing','paid','failed')),
  tx_hash          TEXT,
  attempts         INT NOT NULL DEFAULT 0,
  last_error       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at          TIMESTAMPTZ
);

-- One payout per winning bet/clash — settlement can never double-queue
CREATE UNIQUE INDEX IF NOT EXISTS uniq_verdex_payout_source
  ON verdex_payouts(source, source_id);

CREATE INDEX IF NOT EXISTS idx_verdex_payouts_status    ON verdex_payouts(status);
CREATE INDEX IF NOT EXISTS idx_verdex_payouts_nullifier ON verdex_payouts(world_nullifier);
CREATE INDEX IF NOT EXISTS idx_verdex_payouts_market    ON verdex_payouts(market_id);

-- Service-role only — payout rows are read through the API, never directly
ALTER TABLE verdex_payouts ENABLE ROW LEVEL SECURITY;
