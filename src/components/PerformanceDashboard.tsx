import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Activity, RefreshCw, Trash2, Upload, Wifi, Gauge, Clock, Server,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  getStoredMetrics, clearMetrics, flushMetricsToSupabase, type MetricEntry, type Rating,
} from '@/lib/performance';

// ── Helpers ─────────────────────────────────────────────────────────────────

const VITAL_META: Record<string, { label: string; unit: string; desc: string }> = {
  FCP:  { label: 'FCP',  unit: 'ms', desc: 'First Contentful Paint' },
  LCP:  { label: 'LCP',  unit: 'ms', desc: 'Largest Contentful Paint' },
  INP:  { label: 'INP',  unit: 'ms', desc: 'Interaction to Next Paint' },
  TTFB: { label: 'TTFB', unit: 'ms', desc: 'Time to First Byte' },
  CLS:  { label: 'CLS',  unit: '',   desc: 'Cumulative Layout Shift' },
};

function ratingColor(r?: Rating): string {
  if (r === 'good')              return 'bg-green-500/10 text-green-700 border-green-500/30';
  if (r === 'needs-improvement') return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30';
  if (r === 'poor')              return 'bg-red-500/10 text-red-700 border-red-500/30';
  return 'bg-muted text-muted-foreground';
}

function ratingLabel(r?: Rating): string {
  if (r === 'good')              return 'Bueno';
  if (r === 'needs-improvement') return 'Mejorable';
  if (r === 'poor')              return 'Lento';
  return 'Pendiente';
}

function formatValue(name: string, value: number): string {
  if (name === 'CLS') return value.toFixed(4);
  return `${Math.round(value)} ms`;
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// ── Component ────────────────────────────────────────────────────────────────

export const PerformanceDashboard = () => {
  const [metrics, setMetrics] = useState<MetricEntry[]>([]);
  const [flushing, setFlushing] = useState(false);

  const refresh = useCallback(() => setMetrics(getStoredMetrics()), []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const handleFlush = async () => {
    setFlushing(true);
    const result = await flushMetricsToSupabase();
    setFlushing(false);
    if (result.error) {
      toast.error(`Error al sincronizar: ${result.error}`);
    } else if (result.flushed > 0) {
      toast.success(`${result.flushed} métricas enviadas a la BD`);
      refresh();
    } else {
      toast.info('No hay métricas pendientes');
    }
  };

  const handleClear = () => {
    clearMetrics();
    refresh();
    toast.success('Métricas locales eliminadas');
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const vitals   = metrics.filter(m => m.type === 'web_vital');
  const apiCalls = metrics.filter(m => m.type === 'api_call');

  // Latest vital per name
  const latestVitals = Object.fromEntries(
    Object.keys(VITAL_META).map(name => {
      const entries = vitals.filter(v => v.name === name).sort((a, b) => b.ts - a.ts);
      return [name, entries[0] ?? null];
    })
  ) as Record<string, MetricEntry | null>;

  // API stats grouped by operation
  const apiGroups = apiCalls.reduce<Record<string, { count: number; durations: number[]; failures: number }>>((acc, m) => {
    if (!acc[m.name]) acc[m.name] = { count: 0, durations: [], failures: 0 };
    acc[m.name].count++;
    acc[m.name].durations.push(m.value);
    if (m.meta?.success === false) acc[m.name].failures++;
    return acc;
  }, {});

  const apiRows = Object.entries(apiGroups).map(([name, s]) => ({
    name,
    count: s.count,
    avg: Math.round(avg(s.durations)),
    min: Math.min(...s.durations),
    max: Math.max(...s.durations),
    failures: s.failures,
    rating: (Math.round(avg(s.durations)) < 500 ? 'good' : Math.round(avg(s.durations)) < 2000 ? 'needs-improvement' : 'poor') as Rating,
  })).sort((a, b) => b.avg - a.avg);

  const overallAvgLatency = apiCalls.length
    ? Math.round(avg(apiCalls.map(m => m.value)))
    : null;

  const chartData = apiRows.slice(0, 8).map(r => ({ name: r.name.replace(/_/g, ' '), avg: r.avg }));

  const recent = [...metrics].sort((a, b) => b.ts - a.ts).slice(0, 25);

  return (
    <div className="space-y-6 pt-4">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4" />
          <span>{metrics.length} entradas en caché local</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleFlush} disabled={flushing || metrics.length === 0}>
            <Upload className="h-4 w-4 mr-1" />
            {flushing ? 'Sincronizando…' : `Sincronizar BD (${metrics.length})`}
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear} disabled={metrics.length === 0}
            className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        </div>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Gauge className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Web Vitals</span>
            </div>
            <p className="text-3xl font-bold">{vitals.length}</p>
            <p className="text-xs text-muted-foreground">métricas capturadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-chart-2 mb-1">
              <Server className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Llamadas API</span>
            </div>
            <p className="text-3xl font-bold">{apiCalls.length}</p>
            <p className="text-xs text-muted-foreground">{Object.keys(apiGroups).length} operaciones únicas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-chart-3 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Latencia Prom.</span>
            </div>
            <p className="text-3xl font-bold">{overallAvgLatency !== null ? `${overallAvgLatency}` : '—'}</p>
            <p className="text-xs text-muted-foreground">ms promedio API</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-chart-4 mb-1">
              <Wifi className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Estado Red</span>
            </div>
            <p className="text-3xl font-bold">
              {overallAvgLatency === null
                ? '—'
                : overallAvgLatency < 500 ? 'OK'
                : overallAvgLatency < 2000 ? 'Lenta'
                : 'Crítica'}
            </p>
            <p className="text-xs text-muted-foreground">
              {overallAvgLatency === null ? 'sin datos' :
                overallAvgLatency < 500 ? 'buena conectividad' :
                overallAvgLatency < 2000 ? 'conectividad limitada' :
                'conectividad deficiente'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Web Vitals grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Core Web Vitals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {Object.entries(VITAL_META).map(([name, meta]) => {
              const entry = latestVitals[name];
              return (
                <div key={name} className={`rounded-lg border p-3 ${entry ? ratingColor(entry.rating) : 'border-border bg-muted/30'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold">{meta.label}</span>
                    {entry && (
                      <Badge variant="outline" className={`text-xs ${ratingColor(entry.rating)}`}>
                        {ratingLabel(entry.rating)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xl font-mono font-bold">
                    {entry ? formatValue(name, entry.value) : '—'}
                  </p>
                  <p className="text-xs opacity-70 mt-1">{meta.desc}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* API Latency chart + table */}
      {apiRows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Latencia por Operación (ms)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip
                    formatter={(v) => [`${v} ms`, 'Promedio']}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                  />
                  <Bar dataKey="avg" name="Prom. ms" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Detalle por Operación</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 pr-2 text-muted-foreground font-medium">Operación</th>
                    <th className="text-right py-1 pr-2 text-muted-foreground font-medium">N</th>
                    <th className="text-right py-1 pr-2 text-muted-foreground font-medium">Prom</th>
                    <th className="text-right py-1 text-muted-foreground font-medium">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {apiRows.map(row => (
                    <tr key={row.name} className="border-b last:border-0">
                      <td className="py-1 pr-2 font-mono max-w-[120px] truncate">{row.name}</td>
                      <td className="py-1 pr-2 text-right">{row.count}</td>
                      <td className="py-1 pr-2 text-right font-mono">{row.avg}ms</td>
                      <td className="py-1 text-right">
                        <Badge variant="outline" className={`text-xs ${ratingColor(row.rating)}`}>
                          {ratingLabel(row.rating)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* API latency progress bars */}
      {apiRows.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribución de Latencia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {apiRows.slice(0, 6).map(row => (
              <div key={row.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-mono text-muted-foreground truncate max-w-[200px]">{row.name}</span>
                  <span className="font-medium">{row.avg}ms</span>
                </div>
                <Progress
                  value={Math.min((row.avg / 3000) * 100, 100)}
                  className={`h-2 ${row.rating === 'poor' ? '[&>div]:bg-red-500' : row.rating === 'needs-improvement' ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'}`}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent entries log */}
      {recent.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Registro Reciente (últimas {recent.length} entradas)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 pr-3 text-muted-foreground font-medium">Hora</th>
                  <th className="text-left py-1 pr-3 text-muted-foreground font-medium">Tipo</th>
                  <th className="text-left py-1 pr-3 text-muted-foreground font-medium">Métrica</th>
                  <th className="text-right py-1 pr-3 text-muted-foreground font-medium">Valor</th>
                  <th className="text-right py-1 text-muted-foreground font-medium">Rating</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(m => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="py-1 pr-3 tabular-nums">{format(new Date(m.ts), 'HH:mm:ss')}</td>
                    <td className="py-1 pr-3">
                      <Badge variant="outline" className="text-xs">
                        {m.type === 'web_vital' ? 'Vital' : 'API'}
                      </Badge>
                    </td>
                    <td className="py-1 pr-3 font-mono">{m.name}</td>
                    <td className="py-1 pr-3 text-right font-mono">{formatValue(m.name, m.value)}</td>
                    <td className="py-1 text-right">
                      <span className={`text-xs font-medium ${
                        m.rating === 'good' ? 'text-green-600' :
                        m.rating === 'poor' ? 'text-red-600' :
                        m.rating === 'needs-improvement' ? 'text-yellow-600' :
                        'text-muted-foreground'
                      }`}>
                        {ratingLabel(m.rating)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {metrics.length === 0 && (
        <Card className="py-12 text-center">
          <Activity className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">No hay datos de rendimiento aún</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Las métricas se capturan automáticamente mientras usas la aplicación
          </p>
        </Card>
      )}
    </div>
  );
};
