-- =====================================================
-- Add voter_pin to attendance_records
-- This PIN is generated when a member checks in and is
-- used to authenticate them at the voting/nomination booth.
-- Only members get a PIN (not guests).
-- =====================================================

ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS voter_pin TEXT UNIQUE;

-- Add an index for fast PIN lookups during voting
CREATE INDEX IF NOT EXISTS idx_attendance_voter_pin
  ON public.attendance_records (voter_pin)
  WHERE voter_pin IS NOT NULL;

-- Allow authenticated users to read their own PIN via the existing
-- "Authenticated users can read attendance" SELECT policy (already exists).
-- No new policy needed — reading by PIN is covered.
