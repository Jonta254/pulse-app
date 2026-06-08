-- ═══════════════════════════════════════════════════════════════════════════
-- VeRdex Migration: rename all pulse_* tables → verdex_*
-- Run this ONCE in the Supabase SQL editor (Dashboard → SQL Editor)
-- Safe to run multiple times — uses IF EXISTS / IF NOT EXISTS guards.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Rename core tables
ALTER TABLE IF EXISTS pulse_markets         RENAME TO verdex_markets;
ALTER TABLE IF EXISTS pulse_bets            RENAME TO verdex_bets;
ALTER TABLE IF EXISTS pulse_goals           RENAME TO verdex_goals;
ALTER TABLE IF EXISTS pulse_goal_backs      RENAME TO verdex_goal_backs;
ALTER TABLE IF EXISTS pulse_leaderboard     RENAME TO verdex_leaderboard;
ALTER TABLE IF EXISTS pulse_player_stats    RENAME TO verdex_player_stats;
ALTER TABLE IF EXISTS pulse_clashes         RENAME TO verdex_clashes;

-- 2. Rename indexes (Postgres keeps old index names after table rename)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uniq_pulse_bet_per_human_per_market') THEN
    ALTER INDEX uniq_pulse_bet_per_human_per_market RENAME TO uniq_verdex_bet_per_human_per_market;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_goal_backs_goal') THEN
    -- already generic name, no rename needed
    NULL;
  END IF;
END $$;

-- 3. Rename sequences if any were auto-created with pulse_ prefix
DO $$
DECLARE
  seq TEXT;
BEGIN
  FOR seq IN
    SELECT sequence_name FROM information_schema.sequences
    WHERE sequence_name LIKE 'pulse_%'
  LOOP
    EXECUTE format('ALTER SEQUENCE %I RENAME TO %I', seq, replace(seq, 'pulse_', 'verdex_'));
  END LOOP;
END $$;

-- 4. Verify rename succeeded
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'verdex_%'
ORDER BY table_name;
