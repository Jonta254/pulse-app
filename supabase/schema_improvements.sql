-- VeRdex — Schema improvements migration
-- Run this AFTER the base schemas (verdex_schema.sql, payouts_schema.sql,
-- referrals_schema.sql, combos_schema.sql) have been applied.

-- ── Missing indexes (performance) ─────────────────────────────────────────────

-- Settlement queries need both flags together
CREATE INDEX IF NOT EXISTS idx_verdex_bets_settlement
  ON verdex_bets(confirmed, paid_out)
  WHERE confirmed = true AND paid_out = false;

-- Payout processor scans by status, then by nullifier for dedup
CREATE INDEX IF NOT EXISTS idx_verdex_payouts_compound
  ON verdex_payouts(status, world_nullifier);

-- Clash expiry job finds pending clashes past their deadline
CREATE INDEX IF NOT EXISTS idx_verdex_clashes_expires
  ON verdex_clashes(expires_at)
  WHERE status = 'pending';

-- Goal resolution job scans by status + deadline
CREATE INDEX IF NOT EXISTS idx_verdex_goals_resolution
  ON verdex_goals(status, deadline)
  WHERE status = 'active';

-- Referral reward processing: find unrewarded entries
CREATE INDEX IF NOT EXISTS idx_verdex_referrals_unrewarded
  ON verdex_referrals(referrer_nullifier, rewarded)
  WHERE rewarded = false;

-- ── Explicit RLS deny policies (defence in depth) ─────────────────────────────
-- RLS is already enabled on these tables, so anon access is implicitly denied.
-- These policies make the intent explicit and survive accidental GRANT statements.

CREATE POLICY IF NOT EXISTS "deny anon bets"
  ON verdex_bets FOR ALL TO anon USING (false);

CREATE POLICY IF NOT EXISTS "deny anon payouts"
  ON verdex_payouts FOR ALL TO anon USING (false);

CREATE POLICY IF NOT EXISTS "deny anon referrals"
  ON verdex_referrals FOR ALL TO anon USING (false);

-- Clashes and goals are public-read-only; block all writes from anon
CREATE POLICY IF NOT EXISTS "deny anon clashes write"
  ON verdex_clashes FOR INSERT TO anon WITH CHECK (false);

CREATE POLICY IF NOT EXISTS "deny anon goals write"
  ON verdex_goals FOR INSERT TO anon WITH CHECK (false);
