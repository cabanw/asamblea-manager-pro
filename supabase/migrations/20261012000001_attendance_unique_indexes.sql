-- One attendance record per member/guest per session.
--
-- BACKFILL ONLY: these indexes were created by hand in production (SQL Editor)
-- after verifying there were no duplicate rows. This file records them for the
-- repo; it was NOT applied from here. IF NOT EXISTS makes it a no-op in prod.
--
-- Reconstructed: the exact production definitions (e.g. whether they are
-- partial on IS NOT NULL) were not read back. Verify with:
--   select indexdef from pg_indexes where indexname like 'uq_attendance_session_%';

CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_session_member
  ON public.attendance_records (session_id, member_id)
  WHERE member_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_session_guest
  ON public.attendance_records (session_id, guest_id)
  WHERE guest_id IS NOT NULL;
