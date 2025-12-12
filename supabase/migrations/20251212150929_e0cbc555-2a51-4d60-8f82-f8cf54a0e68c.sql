-- =====================================================
-- FIX: Convert all RESTRICTIVE RLS policies to PERMISSIVE
-- =====================================================

-- =====================================================
-- 1. PROFILES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 2. USER_ROLES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 3. POSITIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can read positions" ON public.positions;
DROP POLICY IF EXISTS "Admins can insert positions" ON public.positions;
DROP POLICY IF EXISTS "Admins can update positions" ON public.positions;
DROP POLICY IF EXISTS "Admins can delete positions" ON public.positions;

CREATE POLICY "Authenticated users can read positions"
ON public.positions FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert positions"
ON public.positions FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update positions"
ON public.positions FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete positions"
ON public.positions FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 4. MEMBERS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Admins and sergeants can read members" ON public.members;
DROP POLICY IF EXISTS "Admins and sergeants can insert members" ON public.members;
DROP POLICY IF EXISTS "Admins and sergeants can update members" ON public.members;
DROP POLICY IF EXISTS "Admins can delete members" ON public.members;

CREATE POLICY "Admins and sergeants can read members"
ON public.members FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'assembly_sergeant'));

CREATE POLICY "Admins and sergeants can insert members"
ON public.members FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'assembly_sergeant'));

CREATE POLICY "Admins and sergeants can update members"
ON public.members FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'assembly_sergeant'));

CREATE POLICY "Admins can delete members"
ON public.members FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 5. ASSEMBLY_SESSIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can read sessions" ON public.assembly_sessions;
DROP POLICY IF EXISTS "Admins and sergeants can insert sessions" ON public.assembly_sessions;
DROP POLICY IF EXISTS "Admins and sergeants can update sessions" ON public.assembly_sessions;
DROP POLICY IF EXISTS "Admins can delete sessions" ON public.assembly_sessions;

CREATE POLICY "Authenticated users can read sessions"
ON public.assembly_sessions FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and sergeants can insert sessions"
ON public.assembly_sessions FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'assembly_sergeant'));

CREATE POLICY "Admins and sergeants can update sessions"
ON public.assembly_sessions FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'assembly_sergeant'));

CREATE POLICY "Admins can delete sessions"
ON public.assembly_sessions FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 6. GUESTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Admins and sergeants can read guests" ON public.guests;
DROP POLICY IF EXISTS "Admins and sergeants can insert guests" ON public.guests;
DROP POLICY IF EXISTS "Admins and sergeants can update guests" ON public.guests;
DROP POLICY IF EXISTS "Admins can delete guests" ON public.guests;

CREATE POLICY "Admins and sergeants can read guests"
ON public.guests FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'assembly_sergeant'));

CREATE POLICY "Admins and sergeants can insert guests"
ON public.guests FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'assembly_sergeant'));

CREATE POLICY "Admins and sergeants can update guests"
ON public.guests FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'assembly_sergeant'));

CREATE POLICY "Admins can delete guests"
ON public.guests FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 7. ATTENDANCE_RECORDS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can read attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Admins and sergeants can insert attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Admins and sergeants can update attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Admins can delete attendance" ON public.attendance_records;

CREATE POLICY "Authenticated users can read attendance"
ON public.attendance_records FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and sergeants can insert attendance"
ON public.attendance_records FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'assembly_sergeant'));

CREATE POLICY "Admins and sergeants can update attendance"
ON public.attendance_records FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'assembly_sergeant'));

CREATE POLICY "Admins can delete attendance"
ON public.attendance_records FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));