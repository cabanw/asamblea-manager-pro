-- Aplicada en prod el 2026-10-12 vía MCP; no reaplicar (no supabase db push/reset).
--
-- Same voting-only count as 20261012000002, for the after_members_change
-- trigger that refreshes total_active_members on every assembly_sessions row.
-- Keeps WHERE true: the project's safeupdate guard rejects an UPDATE without a
-- WHERE clause (see 20260801000002).
--
-- Logic verified against production on 2026-10-12 (pg_get_functiondef):
--   select pg_get_functiondef('public.update_assembly_sessions_on_member_change'::regproc);
CREATE OR REPLACE FUNCTION public.update_assembly_sessions_on_member_change()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.assembly_sessions
    SET total_active_members = (
        SELECT COUNT(*)
        FROM public.members m
        JOIN public.positions p ON p.id = m.position_id
        WHERE m.is_active = true
          AND p.quorum_weight = 1
    )
    WHERE true;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
