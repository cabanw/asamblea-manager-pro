-- Fix RLS policies for guests table (currently public - CRITICAL)
DROP POLICY IF EXISTS "Allow public insert to guests" ON public.guests;
DROP POLICY IF EXISTS "Allow public read access to guests" ON public.guests;

CREATE POLICY "Authenticated users can read guests"
ON public.guests FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and sergeants can insert guests"
ON public.guests FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'assembly_sergeant')));

CREATE POLICY "Admins and sergeants can update guests"
ON public.guests FOR UPDATE
USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'assembly_sergeant')));

CREATE POLICY "Admins can delete guests"
ON public.guests FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Fix RLS policies for attendance_records table (currently public - CRITICAL)
DROP POLICY IF EXISTS "Allow public insert to attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow public read access to attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow public update to attendance" ON public.attendance_records;

CREATE POLICY "Authenticated users can read attendance"
ON public.attendance_records FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and sergeants can insert attendance"
ON public.attendance_records FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'assembly_sergeant')));

CREATE POLICY "Admins and sergeants can update attendance"
ON public.attendance_records FOR UPDATE
USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'assembly_sergeant')));

CREATE POLICY "Admins can delete attendance"
ON public.attendance_records FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add DELETE policies for other tables
CREATE POLICY "Admins can delete members"
ON public.members FOR DELETE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sessions"
ON public.assembly_sessions FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add INSERT policy for profiles (for registration)
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);