-- Drop all existing RESTRICTIVE policies and recreate as PERMISSIVE

-- ============ PROFILES ============
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- ============ USER_ROLES ============
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;

CREATE POLICY "Users can view own roles" ON user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert roles" ON user_roles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update roles" ON user_roles FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete roles" ON user_roles FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ============ POSITIONS ============
DROP POLICY IF EXISTS "Authenticated users can read positions" ON positions;
DROP POLICY IF EXISTS "Admins can insert positions" ON positions;
DROP POLICY IF EXISTS "Admins can update positions" ON positions;
DROP POLICY IF EXISTS "Admins can delete positions" ON positions;

CREATE POLICY "Authenticated users can read positions" ON positions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can insert positions" ON positions FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update positions" ON positions FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete positions" ON positions FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ============ MEMBERS ============
DROP POLICY IF EXISTS "Admins and sergeants can read members" ON members;
DROP POLICY IF EXISTS "Admins and sergeants can insert members" ON members;
DROP POLICY IF EXISTS "Admins and sergeants can update members" ON members;
DROP POLICY IF EXISTS "Admins can delete members" ON members;

CREATE POLICY "Admins and sergeants can read members" ON members FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assembly_sergeant'::app_role));
CREATE POLICY "Admins and sergeants can insert members" ON members FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assembly_sergeant'::app_role));
CREATE POLICY "Admins and sergeants can update members" ON members FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assembly_sergeant'::app_role));
CREATE POLICY "Admins can delete members" ON members FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ============ ASSEMBLY_SESSIONS ============
DROP POLICY IF EXISTS "Authenticated users can read sessions" ON assembly_sessions;
DROP POLICY IF EXISTS "Admins and sergeants can insert sessions" ON assembly_sessions;
DROP POLICY IF EXISTS "Admins and sergeants can update sessions" ON assembly_sessions;
DROP POLICY IF EXISTS "Admins can delete sessions" ON assembly_sessions;

CREATE POLICY "Authenticated users can read sessions" ON assembly_sessions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins and sergeants can insert sessions" ON assembly_sessions FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assembly_sergeant'::app_role));
CREATE POLICY "Admins and sergeants can update sessions" ON assembly_sessions FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assembly_sergeant'::app_role));
CREATE POLICY "Admins can delete sessions" ON assembly_sessions FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ============ GUESTS ============
DROP POLICY IF EXISTS "Admins and sergeants can read guests" ON guests;
DROP POLICY IF EXISTS "Admins and sergeants can insert guests" ON guests;
DROP POLICY IF EXISTS "Admins and sergeants can update guests" ON guests;
DROP POLICY IF EXISTS "Admins can delete guests" ON guests;

CREATE POLICY "Admins and sergeants can read guests" ON guests FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assembly_sergeant'::app_role));
CREATE POLICY "Admins and sergeants can insert guests" ON guests FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assembly_sergeant'::app_role));
CREATE POLICY "Admins and sergeants can update guests" ON guests FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assembly_sergeant'::app_role));
CREATE POLICY "Admins can delete guests" ON guests FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ============ ATTENDANCE_RECORDS ============
DROP POLICY IF EXISTS "Authenticated users can read attendance" ON attendance_records;
DROP POLICY IF EXISTS "Admins and sergeants can insert attendance" ON attendance_records;
DROP POLICY IF EXISTS "Admins and sergeants can update attendance" ON attendance_records;
DROP POLICY IF EXISTS "Admins can delete attendance" ON attendance_records;

CREATE POLICY "Authenticated users can read attendance" ON attendance_records FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins and sergeants can insert attendance" ON attendance_records FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assembly_sergeant'::app_role));
CREATE POLICY "Admins and sergeants can update attendance" ON attendance_records FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assembly_sergeant'::app_role));
CREATE POLICY "Admins can delete attendance" ON attendance_records FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));