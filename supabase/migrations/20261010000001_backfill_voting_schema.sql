-- Backfill: schema de votación que existe en producción sin archivo de migración.
-- Reconstruido el 2026-10-10 leyendo el estado vivo (information_schema, pg_policy,
-- pg_constraint, pg_indexes, pg_proc, pg_publication_tables) del proyecto ihqakomnxfnpggaqmyst.
-- Idempotente: no cambia nada en producción; sirve para recrear el schema en un entorno nuevo.
-- NO aplicar vía apply_migration en producción sin necesidad (ya existe todo).
--
-- Notas:
--  * assembly_attendance es schema huérfano (ningún código la lee ni escribe). Se documenta, no se usa.
--  * has_nominated NO existe en producción (solo has_voted), aunque CLAUDE.md decía que sí.
--    Ver bloque comentado al final.
--  * Dependencias previas: assembly_sessions, attendance_records (con voter_pin UNIQUE), user_roles, app_role.

-- ---------- Tablas ----------
CREATE TABLE IF NOT EXISTS public.elections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (status = ANY (ARRAY['draft','nominating','active','closed']))
);

CREATE TABLE IF NOT EXISTS public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  name text NOT NULL,
  position text NOT NULL,
  description text,
  image_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  nominator_pin text NOT NULL REFERENCES public.attendance_records(voter_pin),
  position text NOT NULL,
  candidate_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (election_id, nominator_pin, position)
);

CREATE TABLE IF NOT EXISTS public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  position_voted text NOT NULL,
  voter_pin text NOT NULL REFERENCES public.attendance_records(voter_pin),
  created_at timestamptz DEFAULT now(),
  UNIQUE (election_id, voter_pin, position_voted)
);

-- Huérfana (sin uso en el código). Documentada solo para que el schema coincida con producción.
CREATE TABLE IF NOT EXISTS public.assembly_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.assembly_sessions(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  attendee_type text NOT NULL,
  position text,
  voter_pin text UNIQUE,
  attended boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ---------- RLS ----------
ALTER TABLE public.elections           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nominations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assembly_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view elections" ON public.elections;
CREATE POLICY "Anyone can view elections" ON public.elections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage elections" ON public.elections;
CREATE POLICY "Admins can manage elections" ON public.elections FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can view candidates" ON public.candidates;
CREATE POLICY "Anyone can view candidates" ON public.candidates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage candidates" ON public.candidates;
CREATE POLICY "Admins can manage candidates" ON public.candidates FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all nominations" ON public.nominations;
CREATE POLICY "Admins can view all nominations" ON public.nominations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can submit a nomination with a valid voter PIN" ON public.nominations;
CREATE POLICY "Anyone can submit a nomination with a valid voter PIN" ON public.nominations FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.elections WHERE elections.id = nominations.election_id AND elections.status = 'nominating')
    AND EXISTS (SELECT 1 FROM public.attendance_records
                WHERE attendance_records.voter_pin = nominations.nominator_pin
                  AND attendance_records.is_present = true
                  AND attendance_records.attendee_type = 'member')
  );

DROP POLICY IF EXISTS "Admins can view all votes" ON public.votes;
CREATE POLICY "Admins can view all votes" ON public.votes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can submit a vote with a valid voter PIN" ON public.votes;
CREATE POLICY "Anyone can submit a vote with a valid voter PIN" ON public.votes FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.elections WHERE elections.id = votes.election_id AND elections.status = 'active')
    AND EXISTS (SELECT 1 FROM public.attendance_records
                WHERE attendance_records.voter_pin = votes.voter_pin
                  AND attendance_records.is_present = true
                  AND attendance_records.attendee_type = 'member')
  );

DROP POLICY IF EXISTS "Admins can view attendance" ON public.assembly_attendance;
CREATE POLICY "Admins can view attendance" ON public.assembly_attendance FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role));

-- ---------- Función ----------
CREATE OR REPLACE FUNCTION public.has_voted(p_election_id uuid, p_voter_pin text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.votes
    WHERE election_id = p_election_id AND voter_pin = p_voter_pin
  );
$$;

-- ---------- Realtime (elections, votes, nominations; members y attendance_records ya cubiertos por 20260802000001) ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['elections','votes','nominations'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- ---------- PENDIENTE: has_nominated NO existe en producción ----------
-- NominationBooth.tsx:47 la llama vía rpc('has_nominated') y fallaría hoy (PGRST202).
-- Crearla antes de reactivar VOTING_ENABLED en v2.1. Propuesta (NO aplicada):
-- CREATE OR REPLACE FUNCTION public.has_nominated(p_election_id uuid, p_nominator_pin text, p_position text)
-- RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
--   SELECT EXISTS (SELECT 1 FROM public.nominations
--     WHERE election_id = p_election_id AND nominator_pin = p_nominator_pin AND position = p_position);
-- $$;
