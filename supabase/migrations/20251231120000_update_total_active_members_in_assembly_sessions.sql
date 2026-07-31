
CREATE OR REPLACE FUNCTION public.update_total_active_members()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate the total number of active members
    NEW.total_active_members = (SELECT COUNT(*) FROM public.members WHERE is_active = true);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger to update the total_active_members column before a new assembly session is inserted
CREATE TRIGGER before_insert_assembly_sessions
BEFORE INSERT ON public.assembly_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_total_active_members();

-- Create a trigger to update the total_active_members on members table changes
CREATE OR REPLACE FUNCTION public.update_assembly_sessions_on_member_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the total_active_members in all assembly_sessions
    UPDATE public.assembly_sessions
    SET total_active_members = (SELECT COUNT(*) FROM public.members WHERE is_active = true);
    RETURN NULL; -- This trigger does not modify the row being inserted/updated/deleted
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_members_change
AFTER INSERT OR UPDATE OF is_active OR DELETE ON public.members
FOR EACH STATEMENT
EXECUTE FUNCTION public.update_assembly_sessions_on_member_change();
