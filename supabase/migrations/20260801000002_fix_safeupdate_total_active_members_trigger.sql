-- The after_members_change trigger recomputes total_active_members across
-- every assembly_sessions row on member insert/update/delete. Its UPDATE had
-- no WHERE clause, which this project's safeupdate guard rejects outright —
-- every new-member registration (edge function and manual) was failing with
-- "UPDATE requires a WHERE clause" once the trigger fired. WHERE true keeps
-- the original all-rows behavior while satisfying the guard.
CREATE OR REPLACE FUNCTION public.update_assembly_sessions_on_member_change()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.assembly_sessions
    SET total_active_members = (SELECT COUNT(*) FROM public.members WHERE is_active = true)
    WHERE true;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
