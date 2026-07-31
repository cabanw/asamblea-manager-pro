-- "Ministro Certificado Pastor" is a certified minister who also holds the
-- title of Pastor, and votes. Plain "Ministro Certificado" (no Pastor title)
-- does not vote, per assembly bylaws clarified after the 2026-06-06 field test.
INSERT INTO public.positions (name, type, quorum_weight)
VALUES ('Ministro Certificado Pastor', 'ministro_certificado_pastor', 1)
ON CONFLICT DO NOTHING;

UPDATE public.positions SET quorum_weight = 0 WHERE type = 'ministro_certificado';
