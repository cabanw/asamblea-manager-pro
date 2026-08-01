DROP POLICY IF EXISTS "Admins and sergeants can read members" ON members;
DROP POLICY IF EXISTS "Admins and sergeants can insert members" ON members;
DROP POLICY IF EXISTS "Admins and sergeants can update members" ON members;

CREATE POLICY "Admins, sergeants and secretaries can read members" ON members
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'assembly_sergeant'::app_role) OR
    has_role(auth.uid(), 'secretary'::app_role)
  );

CREATE POLICY "Admins, sergeants and secretaries can insert members" ON members
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'assembly_sergeant'::app_role) OR
    has_role(auth.uid(), 'secretary'::app_role)
  );

CREATE POLICY "Admins, sergeants and secretaries can update members" ON members
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'assembly_sergeant'::app_role) OR
    has_role(auth.uid(), 'secretary'::app_role)
  );
