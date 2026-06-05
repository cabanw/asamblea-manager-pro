-- Add voter position enum values
ALTER TYPE position_type ADD VALUE IF NOT EXISTS 'ministro_certificado';
ALTER TYPE position_type ADD VALUE IF NOT EXISTS 'ministro_licenciado';
ALTER TYPE position_type ADD VALUE IF NOT EXISTS 'delegado_pastor';

-- Insert missing voter positions (run in separate transaction after enum commit)
INSERT INTO public.positions (name, type, quorum_weight)
VALUES
  ('Ministro Certificado', 'ministro_certificado', 1),
  ('Ministro Licenciado',  'ministro_licenciado',  1),
  ('Delegado Pastor',      'delegado_pastor',       1)
ON CONFLICT DO NOTHING;

-- quorum_weight = 1 for voting positions only
UPDATE public.positions SET quorum_weight = 1
WHERE name IN ('Ministro Ordenado','Ministro Certificado','Ministro Licenciado','Delegado Pastor');

-- quorum_weight = 0 for administrative / non-voting positions
UPDATE public.positions SET quorum_weight = 0
WHERE name NOT IN ('Ministro Ordenado','Ministro Certificado','Ministro Licenciado','Delegado Pastor');
