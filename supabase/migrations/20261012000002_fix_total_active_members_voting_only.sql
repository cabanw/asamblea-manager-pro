-- Aplicada en prod el 2026-10-12 vía MCP; no reaplicar (no supabase db push/reset).
--
-- total_active_members (snapshot set when a session is created) counted every
-- active member, while the app's quorum denominator (fetchQuorumStats in
-- src/lib/quorum.ts) counts only active members in voting positions
-- (positions.quorum_weight = 1). Align the trigger with that rule. Members with
-- no position_id are excluded by the inner join, same as the app.
--
-- Logic verified against production on 2026-10-12 (pg_get_functiondef):
--   select pg_get_functiondef('public.update_total_active_members'::regproc);
CREATE OR REPLACE FUNCTION public.update_total_active_members()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_active_members = (
        SELECT COUNT(*)
        FROM public.members m
        JOIN public.positions p ON p.id = m.position_id
        WHERE m.is_active = true
          AND p.quorum_weight = 1
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
