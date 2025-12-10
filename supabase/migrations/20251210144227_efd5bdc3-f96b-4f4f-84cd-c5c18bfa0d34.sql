-- Fix guests table - restrict to admins and sergeants only (not all authenticated users)
DROP POLICY IF EXISTS "Authenticated users can read guests" ON public.guests;

CREATE POLICY "Admins and sergeants can read guests"
ON public.guests FOR SELECT
USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'assembly_sergeant')));

-- Fix positions table - require authentication
DROP POLICY IF EXISTS "Allow public read access to positions" ON public.positions;

CREATE POLICY "Authenticated users can read positions"
ON public.positions FOR SELECT
USING (auth.uid() IS NOT NULL);