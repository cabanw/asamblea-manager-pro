-- Drop existing overly permissive policies on members table
DROP POLICY IF EXISTS "Allow public insert to members" ON public.members;
DROP POLICY IF EXISTS "Allow public read access to members" ON public.members;
DROP POLICY IF EXISTS "Allow public update to members" ON public.members;

-- Create secure RLS policies for members table
-- Only authenticated users with admin or assembly_sergeant roles can manage members
CREATE POLICY "Admins and sergeants can read members"
ON public.members
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'assembly_sergeant'::app_role)
  )
);

CREATE POLICY "Admins and sergeants can insert members"
ON public.members
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'assembly_sergeant'::app_role)
  )
);

CREATE POLICY "Admins and sergeants can update members"
ON public.members
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'assembly_sergeant'::app_role)
  )
);

-- Drop existing overly permissive policies on assembly_sessions table
DROP POLICY IF EXISTS "Allow public insert to sessions" ON public.assembly_sessions;
DROP POLICY IF EXISTS "Allow public read access to sessions" ON public.assembly_sessions;
DROP POLICY IF EXISTS "Allow public update to sessions" ON public.assembly_sessions;

-- Create secure RLS policies for assembly_sessions table
-- Read access for authenticated users, write access for admin/sergeants only
CREATE POLICY "Authenticated users can read sessions"
ON public.assembly_sessions
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and sergeants can insert sessions"
ON public.assembly_sessions
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'assembly_sergeant'::app_role)
  )
);

CREATE POLICY "Admins and sergeants can update sessions"
ON public.assembly_sessions
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'assembly_sergeant'::app_role)
  )
);