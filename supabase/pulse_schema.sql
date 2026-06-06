-- PULSE — Human Prediction Network
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New Query)
-- Version 2 — adds goal_backs, creator fields, increment RPC, streak columns

-- Markets (AI-generated or manually created)
CREATE TABLE IF NOT EXISTS pulse_markets (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT NOT NULL CHECK (category IN ('crypto','sports','world','culture','micro')),
  closes_at     TIMESTAMPTZ NOT NULL,
  resolves_at   TIMESTAMPTZ NOT NULL,
  outcome       TEXT CHECK (outcome IN ('yes','no')),
  yes_pool      NUMERIC(14,4) NOT NULL DEFAULT 0,
  no_pool       NUMERIC(14,4) NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','resolved','cancelled')),
  featured      BOOLEAN NOT NULL DEFAULT false,
  ai_generated  BOOLEAN NOT NULL DEFAULT false,
  total_bettors INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pulse_markets_status   ON pulse_markets(status);
CREATE INDEX IF NOT EXISTS idx_pulse_markets_category ON pulse_markets(category);
CREATE INDEX IF NOT EXISTS idx_pulse_markets_closes   ON pulse_markets(closes_at);

-- Bets placed by verified humans
CREATE TABLE IF NOT EXISTS pulse_bets (
  id               TEXT PRIMARY KEY,
  market_id        TEXT NOT NULL REFERENCES pulse_markets(id) ON DELETE CASCADE,
  world_nullifier  TEXT NOT NULL,
  username         TEXT,
  position         TEXT NOT NULL CHECK (position IN ('yes','no')),
  amount_wld       NUMERIC(12,4) NOT NULL CHECK (amount_wld > 0),
  tx_reference     TEXT NOT NULL UNIQUE,
  confirmed        BOOLEAN NOT NULL DEFAULT false,
  payout_wld       NUMERIC(12,4),
  paid_out         BOOLEAN NOT NULL DEFAULT false,
  settled          BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pulse_bets_market    ON pulse_bets(market_id);
CREATE INDEX IF NOT EXISTS idx_pulse_bets_nullifier ON pulse_bets(world_nullifier);
-- Prevent same human betting on the same market twice (once confirmed)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pulse_bet_per_human_per_market
  ON pulse_bets(market_id, world_nullifier) WHERE confirmed = true;

-- Per-human leaderboard stats
CREATE TABLE IF NOT EXISTS pulse_player_stats (
  world_nullifier  TEXT PRIMARY KEY,
  username         TEXT,
  total_bets       INT NOT NULL DEFAULT 0,
  total_wagered    NUMERIC(14,4) NOT NULL DEFAULT 0,
  total_won        NUMERIC(14,4) NOT NULL DEFAULT 0,
  win_streak       INT NOT NULL DEFAULT 0,
  best_streak      INT NOT NULL DEFAULT 0,
  specialty        TEXT NOT NULL DEFAULT 'General',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Personal goals staked by humans
CREATE TABLE IF NOT EXISTS pulse_goals (
  id                TEXT PRIMARY KEY,
  creator_nullifier TEXT NOT NULL,
  creator_username  TEXT,
  title             TEXT NOT NULL,
  description       TEXT,
  deadline          TIMESTAMPTZ NOT NULL,
  stake_wld         NUMERIC(12,4) NOT NULL CHECK (stake_wld > 0),
  yes_pool          NUMERIC(14,4) NOT NULL DEFAULT 0,
  no_pool           NUMERIC(14,4) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','failed','cancelled')),
  evidence          TEXT,
  tx_reference      TEXT NOT NULL UNIQUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pulse_goals_creator ON pulse_goals(creator_nullifier);
CREATE INDEX IF NOT EXISTS idx_pulse_goals_status  ON pulse_goals(status);

-- Backings on personal goals (YES = believe they'll do it, NO = they won't)
CREATE TABLE IF NOT EXISTS pulse_goal_backs (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id          TEXT NOT NULL REFERENCES pulse_goals(id) ON DELETE CASCADE,
  backer_nullifier TEXT NOT NULL,
  backer_username  TEXT,
  position         TEXT NOT NULL CHECK (position IN ('yes','no')),
  amount_wld       NUMERIC(12,4) NOT NULL CHECK (amount_wld > 0),
  tx_reference     TEXT NOT NULL UNIQUE,
  payout_wld       NUMERIC(12,4),
  settled          BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_goal_back_per_human
  ON pulse_goal_backs(goal_id, backer_nullifier);
CREATE INDEX IF NOT EXISTS idx_goal_backs_goal ON pulse_goal_backs(goal_id);

-- 1v1 Clash challenges
CREATE TABLE IF NOT EXISTS pulse_clashes (
  id                   TEXT PRIMARY KEY,
  market_id            TEXT NOT NULL REFERENCES pulse_markets(id) ON DELETE CASCADE,
  market_title         TEXT NOT NULL,
  creator_nullifier    TEXT NOT NULL,
  creator_username     TEXT,
  creator_position     TEXT NOT NULL CHECK (creator_position IN ('yes','no')),
  stake_wld            NUMERIC(12,4) NOT NULL CHECK (stake_wld > 0),
  creator_tx_ref       TEXT NOT NULL,
  challenger_nullifier TEXT,
  challenger_username  TEXT,
  challenger_tx_ref    TEXT,
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','resolved','expired')),
  winner_nullifier     TEXT,
  payout_wld           NUMERIC(12,4),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at           TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pulse_clashes_creator    ON pulse_clashes(creator_nullifier);
CREATE INDEX IF NOT EXISTS idx_pulse_clashes_challenger ON pulse_clashes(challenger_nullifier);
CREATE INDEX IF NOT EXISTS idx_pulse_clashes_market     ON pulse_clashes(market_id);
CREATE INDEX IF NOT EXISTS idx_pulse_clashes_status     ON pulse_clashes(status);

-- ── Row-level security ────────────────────────────────────────────────────────
ALTER TABLE pulse_markets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_bets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_goals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_goal_backs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_clashes      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read markets"      ON pulse_markets      FOR SELECT USING (true);
CREATE POLICY "public read leaderboard"  ON pulse_player_stats FOR SELECT USING (true);
CREATE POLICY "public read goals"        ON pulse_goals        FOR SELECT USING (true);
CREATE POLICY "public read goal_backs"   ON pulse_goal_backs   FOR SELECT USING (true);
CREATE POLICY "public read clashes"      ON pulse_clashes      FOR SELECT USING (true);
-- bets are private — only service role reads them server-side

-- ── Helper RPC: atomically increment a goal pool ──────────────────────────────
CREATE OR REPLACE FUNCTION increment_goal_pool(
  p_goal_id TEXT,
  p_field   TEXT,
  p_amount  NUMERIC
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_field = 'yes_pool' THEN
    UPDATE pulse_goals SET yes_pool = yes_pool + p_amount WHERE id = p_goal_id;
  ELSIF p_field = 'no_pool' THEN
    UPDATE pulse_goals SET no_pool = no_pool + p_amount WHERE id = p_goal_id;
  END IF;
END;
$$;
