-- Create the table to store unique registration links for assemblies
CREATE TABLE public.assembly_registration_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    assembly_id uuid NOT NULL REFERENCES public.assembly_sessions(id) ON DELETE CASCADE,
    token uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add comments to the table and columns
COMMENT ON TABLE public.assembly_registration_links IS 'Stores unique, expiring registration links for assemblies to allow public registration.';
COMMENT ON COLUMN public.assembly_registration_links.assembly_id IS 'The assembly for which the registration link is generated.';
COMMENT ON COLUMN public.assembly_registration_links.token IS 'The unique token for the registration link.';
COMMENT ON COLUMN public.assembly_registration_links.expires_at IS 'The expiration date for the registration link.';

-- Enable Row Level Security
ALTER TABLE public.assembly_registration_links ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage registration links
CREATE POLICY "Allow admins to manage registration links"
ON public.assembly_registration_links
FOR ALL
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') IS NOT NULL
)
WITH CHECK (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') IS NOT NULL
);

-- Create a policy to allow authenticated users to read links
CREATE POLICY "Allow authenticated users to read links"
ON public.assembly_registration_links
FOR SELECT
USING (auth.role() = 'authenticated');
