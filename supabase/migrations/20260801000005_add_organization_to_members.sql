ALTER TABLE public.members ADD COLUMN IF NOT EXISTS organization TEXT;
COMMENT ON COLUMN public.members.organization IS 'Iglesia o entidad a la que pertenece el miembro (FIADAH)';
