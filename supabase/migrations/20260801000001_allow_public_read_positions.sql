-- The public self-registration form (PublicRegistration.tsx, reached via the
-- event QR code) runs unauthenticated and needs to list positions for the
-- "Credencial / Miembro Activo" dropdown. A prior security pass restricted
-- positions SELECT to authenticated users only, which silently breaks that
-- dropdown for anon requests (RLS just returns zero rows, no error).
-- Position names aren't sensitive, so restore public read access.
DROP POLICY IF EXISTS "Authenticated users can read positions" ON public.positions;

CREATE POLICY "Public can read positions"
ON public.positions FOR SELECT
USING (true);
