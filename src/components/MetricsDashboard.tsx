import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { timedQuery } from '@/lib/performance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Users, UserPlus, Clock, TrendingUp, CheckCircle2,
  XCircle, Download, RefreshCw, Award, Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { QUORUM_FRACTION } from '@/lib/quorum';

interface AttendanceRecord {
  id: string;
  attendee_type: string;
  is_present: boolean;
  check_in_time: string | null;
  check_out_time: string | null;
  members: { name: string; positions: { name: string } | null } | null;
  guests: { name: string; organization: string | null } | null;
}

interface SessionInfo {
  id: string;
  name: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  quorum_required: number;
}

interface CheckInBucket {
  time: string;
  members: number;
  guests: number;
  cumulative: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

interface MetricsDashboardProps {
  sessionId?: string;
}

export const MetricsDashboard = ({ sessionId }: MetricsDashboardProps) => {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [totalActiveMembers, setTotalActiveMembers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    const targetSessionId = sessionId;
    if (!targetSessionId) return;

    setLoading(true);
    try {
      const [sessionResult, recordsResult, membersResult] = await Promise.all([
        timedQuery('session_fetch', () =>
          supabase.from('assembly_sessions').select('*').eq('id', targetSessionId).single()
        ),
        timedQuery('attendance_records_fetch', () =>
          supabase
            .from('attendance_records')
            .select(`
              id, attendee_type, is_present, check_in_time, check_out_time,
              members:member_id (name, positions:position_id (name)),
              guests:guest_id (name, organization)
            `)
            .eq('session_id', targetSessionId)
            .order('check_in_time', { ascending: true })
        ),
        timedQuery('members_count', () =>
          supabase.from('members').select('id', { count: 'exact' }).eq('is_active', true)
        ),
      ]);

      if (sessionResult.data) setSession(sessionResult.data);
      if (recordsResult.data) setRecords(recordsResult.data as AttendanceRecord[]);
      if (membersResult.count !== null) setTotalActiveMembers(membersResult.count);
      setLastRefreshed(new Date());
    } catch {
      toast.error('Error loading metrics');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) loadData();
  }, [sessionId, loadData]);

  // ── Derived metrics ──────────────────────────────────────────────
  const memberRecords = records.filter(r => r.attendee_type === 'member');
  const guestRecords  = records.filter(r => r.attendee_type === 'guest');
  const presentMembers = memberRecords.filter(r => r.is_present).length;
  const presentGuests  = guestRecords.filter(r => r.is_present).length;
  const quorumThreshold = Math.ceil(QUORUM_FRACTION * totalActiveMembers);
  const quorumAchieved  = totalActiveMembers > 0 && presentMembers >= quorumThreshold;
  const attendanceRate  = totalActiveMembers > 0 ? (presentMembers / totalActiveMembers) * 100 : 0;

  // ── Check-in timeline (bucketed by 15-min intervals) ────────────
  const buildTimeline = (): CheckInBucket[] => {
    const withTime = records.filter(r => r.check_in_time);
    if (withTime.length === 0) return [];

    const times = withTime.map(r => parseISO(r.check_in_time!).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const buckets: Record<string, CheckInBucket> = {};

    // Create 15-minute buckets
    let cursor = minTime - (minTime % (15 * 60 * 1000));
    while (cursor <= maxTime + 15 * 60 * 1000) {
      const label = format(new Date(cursor), 'h:mm a');
      buckets[cursor] = { time: label, members: 0, guests: 0, cumulative: 0 };
      cursor += 15 * 60 * 1000;
    }

    withTime.forEach(r => {
      const t = parseISO(r.check_in_time!).getTime();
      const bucket = t - (t % (15 * 60 * 1000));
      if (buckets[bucket]) {
        if (r.attendee_type === 'member') buckets[bucket].members++;
        else buckets[bucket].guests++;
      }
    });

    let cum = 0;
    return Object.values(buckets).map(b => {
      cum += b.members + b.guests;
      return { ...b, cumulative: cum };
    });
  };

  const timeline = buildTimeline();

  // ── Quorum achievement time ──────────────────────────────────────
  const quorumAchievedAt = (() => {
    if (totalActiveMembers === 0) return null;
    const sorted = [...memberRecords]
      .filter(r => r.check_in_time)
      .sort((a, b) => parseISO(a.check_in_time!).getTime() - parseISO(b.check_in_time!).getTime());

    let count = 0;
    for (const r of sorted) {
      count++;
      if (count >= quorumThreshold) return r.check_in_time;
    }
    return null;
  })();

  // ── Duration from first to last check-in ─────────────────────────
  const sessionDuration = (() => {
    const withTime = records.filter(r => r.check_in_time);
    if (withTime.length < 2) return null;
    const times = withTime.map(r => parseISO(r.check_in_time!).getTime());
    return differenceInMinutes(Math.max(...times), Math.min(...times));
  })();

  // ── Pie data ─────────────────────────────────────────────────────
  const pieData = [
    { name: 'Miembros Presentes', value: presentMembers },
    { name: 'Miembros Ausentes', value: totalActiveMembers - presentMembers },
    { name: 'Invitados', value: presentGuests },
  ].filter(d => d.value > 0);

  // ── Export CSV ───────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [
      ['Tipo', 'Nombre', 'Posición/Organización', 'Check-In', 'Check-Out', 'Estado'],
      ...records.map(r => {
        const name = r.attendee_type === 'member' ? r.members?.name : r.guests?.name;
        const sub  = r.attendee_type === 'member' ? r.members?.positions?.name : r.guests?.organization;
        return [
          r.attendee_type === 'member' ? 'Miembro' : 'Invitado',
          name ?? '',
          sub ?? '',
          r.check_in_time ? format(parseISO(r.check_in_time), 'h:mm a') : '',
          r.check_out_time ? format(parseISO(r.check_out_time), 'h:mm a') : '',
          r.is_present ? 'Presente' : 'Se fue',
        ];
      }),
    ];

    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asamblea-metricas-${session?.date ?? 'report'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Reporte CSV descargado');
  };

  if (!sessionId) {
    return (
      <Card className="p-12 text-center text-muted-foreground">
        <Activity className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">No hay sesión activa</p>
        <p className="text-sm">Crea o activa una sesión de asamblea para ver las métricas.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{session?.name ?? 'Sesión'}</h2>
          {lastRefreshed && (
            <p className="text-xs text-muted-foreground">
              Actualizado: {format(lastRefreshed, 'h:mm:ss a')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button variant="default" size="sm" onClick={exportCSV} disabled={records.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Miembros Presentes</span>
            </div>
            <p className="text-3xl font-bold">{presentMembers}</p>
            <p className="text-xs text-muted-foreground">de {totalActiveMembers} activos</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-chart-2/10 to-chart-2/5 border-chart-2/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-chart-2 mb-1">
              <UserPlus className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Invitados</span>
            </div>
            <p className="text-3xl font-bold">{presentGuests}</p>
            <p className="text-xs text-muted-foreground">registrados hoy</p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${quorumAchieved ? 'from-green-500/10 to-green-500/5 border-green-500/20' : 'from-yellow-500/10 to-yellow-500/5 border-yellow-500/20'}`}>
          <CardContent className="p-4">
            <div className={`flex items-center gap-2 mb-1 ${quorumAchieved ? 'text-green-600' : 'text-yellow-600'}`}>
              {quorumAchieved ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              <span className="text-xs font-medium uppercase tracking-wide">Quórum</span>
            </div>
            <p className="text-3xl font-bold">{attendanceRate.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">
              {quorumAchieved ? '✓ Alcanzado' : `Necesita ${quorumThreshold - presentMembers} más`}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-chart-4/10 to-chart-4/5 border-chart-4/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-chart-4 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Duración</span>
            </div>
            <p className="text-3xl font-bold">
              {sessionDuration !== null ? `${sessionDuration}m` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">primer → último check-in</p>
          </CardContent>
        </Card>
      </div>

      {/* Quorum progress bar */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progreso hacia Quórum (2/3 = {quorumThreshold} miembros)</span>
            <Badge variant={quorumAchieved ? 'default' : 'secondary'}>
              {presentMembers}/{quorumThreshold}
            </Badge>
          </div>
          <Progress value={Math.min((presentMembers / quorumThreshold) * 100, 100)} className="h-3" />
          {quorumAchievedAt && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Award className="h-3 w-3 text-primary" />
              Quórum alcanzado a las {format(parseISO(quorumAchievedAt), 'h:mm a')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Timeline chart */}
      {timeline.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Línea de Tiempo de Check-Ins (Intervalos de 15 min)
            </CardTitle>
            <CardDescription>Flujo de llegadas durante la sesión</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={timeline} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorMembers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorGuests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Legend />
                <Area type="monotone" dataKey="members" name="Miembros" stroke="hsl(var(--primary))" fill="url(#colorMembers)" strokeWidth={2} />
                <Area type="monotone" dataKey="guests"  name="Invitados" stroke="hsl(var(--chart-2))" fill="url(#colorGuests)"  strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Bar chart + Pie side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cumulative arrivals bar */}
        {timeline.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Acumulado de Llegadas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={timeline} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                  />
                  <Bar dataKey="cumulative" name="Total Acumulado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Attendance pie */}
        {pieData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Distribución de Asistentes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend iconType="circle" iconSize={10} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Attendee roster */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Lista de Asistentes ({records.length} registros)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Nombre</th>
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium hidden sm:table-cell">Tipo/Posición</th>
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Check-In</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const name = r.attendee_type === 'member' ? r.members?.name : r.guests?.name;
                  const sub  = r.attendee_type === 'member' ? r.members?.positions?.name : r.guests?.organization;
                  return (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2 pr-4 font-medium">{name ?? '—'}</td>
                      <td className="py-2 pr-4 text-muted-foreground hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {r.attendee_type === 'member' ? 'Miembro' : 'Invitado'}
                          </Badge>
                          {sub && <span>{sub}</span>}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {r.check_in_time ? format(parseISO(r.check_in_time), 'h:mm a') : '—'}
                      </td>
                      <td className="py-2">
                        <Badge variant={r.is_present ? 'default' : 'secondary'} className="text-xs">
                          {r.is_present ? 'Presente' : 'Se fue'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      No hay registros de asistencia aún
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
