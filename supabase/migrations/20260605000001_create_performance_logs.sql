-- Performance monitoring table for field test diagnostics
CREATE TABLE IF NOT EXISTS public.performance_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  metric_type  TEXT        NOT NULL CHECK (metric_type IN ('web_vital', 'api_call')),
  metric_name  TEXT        NOT NULL,
  value        NUMERIC     NOT NULL,
  rating       TEXT        CHECK (rating IN ('good', 'needs-improvement', 'poor')),
  metadata     JSONB
);

-- Index for time-based queries
CREATE INDEX idx_performance_logs_recorded_at ON public.performance_logs (recorded_at DESC);
CREATE INDEX idx_performance_logs_metric_type ON public.performance_logs (metric_type, metric_name);

ALTER TABLE public.performance_logs ENABLE ROW LEVEL SECURITY;

-- Any authenticated user (or anon on public pages) can insert their own metrics
CREATE POLICY "Anyone can insert performance logs"
  ON public.performance_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read the aggregate data
CREATE POLICY "Admins can read performance logs"
  ON public.performance_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
