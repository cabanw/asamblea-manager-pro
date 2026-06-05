import { onFCP, onLCP, onCLS, onINP, onTTFB, type Metric } from 'web-vitals';

const STORAGE_KEY = 'amp_perf_metrics';
const MAX_STORED = 200;

export type Rating = 'good' | 'needs-improvement' | 'poor';

export type MetricEntry = {
  id: string;
  ts: number;
  type: 'web_vital' | 'api_call';
  name: string;
  value: number;
  rating?: Rating;
  meta?: Record<string, unknown>;
};

function readStored(): MetricEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MetricEntry[]) : [];
  } catch {
    return [];
  }
}

function writeStored(entries: MetricEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_STORED)));
  } catch { /* storage full — silently drop */ }
}

function append(entry: MetricEntry) {
  const existing = readStored();
  // Web vitals may fire multiple times with the same id — keep latest
  const idx = existing.findIndex(e => e.id === entry.id);
  if (idx >= 0) {
    existing[idx] = entry;
    writeStored(existing);
  } else {
    writeStored([...existing, entry]);
  }
}

export function trackVital(metric: Metric) {
  append({
    id: metric.id,
    ts: Date.now(),
    type: 'web_vital',
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
  });
}

export function trackApiCall(operation: string, durationMs: number, success: boolean) {
  const ms = Math.round(durationMs);
  append({
    id: `api_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ts: Date.now(),
    type: 'api_call',
    name: operation,
    value: ms,
    rating: ms < 500 ? 'good' : ms < 2000 ? 'needs-improvement' : 'poor',
    meta: { success },
  });
}

export function getStoredMetrics(): MetricEntry[] {
  return readStored();
}

export function clearMetrics() {
  localStorage.removeItem(STORAGE_KEY);
}

let vitalsStarted = false;

export function initWebVitals() {
  if (vitalsStarted || typeof window === 'undefined') return;
  vitalsStarted = true;
  onFCP(trackVital);
  onLCP(trackVital);
  onCLS(trackVital);
  onINP(trackVital);
  onTTFB(trackVital);
}

/** Wraps any async function and records its duration as an API call metric. */
export async function timedQuery<T>(
  label: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const t0 = performance.now();
  let ok = true;
  try {
    return await queryFn();
  } catch (e) {
    ok = false;
    throw e;
  } finally {
    trackApiCall(label, performance.now() - t0, ok);
  }
}

/** Sends all buffered metrics to Supabase and clears localStorage on success. */
export async function flushMetricsToSupabase(): Promise<{ flushed: number; error?: string }> {
  const entries = readStored();
  if (!entries.length) return { flushed: 0 };

  // Dynamic import avoids circular-dep risk
  const { supabase } = await import('@/integrations/supabase/client');

  const rows = entries.map(e => ({
    metric_type: e.type,
    metric_name: e.name,
    value: e.value,
    rating: e.rating ?? null,
    metadata: e.meta ?? null,
    recorded_at: new Date(e.ts).toISOString(),
  }));

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('performance_logs').insert(rows);
    if (error) return { flushed: 0, error: String(error.message ?? error) };
    clearMetrics();
    return { flushed: rows.length };
  } catch (e) {
    return { flushed: 0, error: String(e) };
  }
}
