
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AttendanceManager } from '@/components/AttendanceManager';
import { QuorumStatus } from '@/components/QuorumStatus';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserPlus } from 'lucide-react';
import { QUORUM_FRACTION } from '@/lib/quorum';
import { toast } from 'sonner';

interface RosterMember {
  id: string;
  name: string;
  position: string | null;
}

type AttendanceRow = {
  id: string;
  session_id: string;
  attendee_type: 'member' | 'guest';
  is_present: boolean;
};

const Attendance = () => {
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [stats, setStats] = useState({
    totalMembers: 0,
    presentMembers: 0,
    presentGuests: 0,
    quorumRequired: QUORUM_FRACTION * 100, // ~66.6667
    quorumAchieved: false,
    // optional: membersNeededForQuorum to show in UI
    membersNeededForQuorum: 0,
  });
  const [notPresentMembers, setNotPresentMembers] = useState<RosterMember[]>([]);
  const [markingPresent, setMarkingPresent] = useState<string | null>(null);

  useEffect(() => {
    loadActiveSession();
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`attendance-changes-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          loadStats(sessionId);
          loadRosterStatus(sessionId);
        }
      )
      .on(
        // Recalcula totalMembers si alguien activa/desactiva un miembro o le
        // cambia la posición durante el evento (afecta el denominador del quórum)
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members',
        },
        () => {
          loadStats(sessionId);
          loadRosterStatus(sessionId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const loadActiveSession = async () => {
    const { data: existingSession, error } = await supabase
      .from('assembly_sessions')
      .select('*')
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('Error loading active session:', error);
      return;
    }

    if (existingSession) {
      setSessionId(existingSession.id);
      loadStats(existingSession.id);
      loadRosterStatus(existingSession.id);
    }
  };

  const loadRosterStatus = async (sessId: string) => {
    const [rosterResult, presentResult] = await Promise.all([
      supabase
        .from('members')
        .select('id, name, positions(name)')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('attendance_records')
        .select('member_id')
        .eq('session_id', sessId)
        .eq('attendee_type', 'member')
        .eq('is_present', true),
    ]);

    if (rosterResult.error || presentResult.error) {
      console.error('Error loading roster status:', rosterResult.error || presentResult.error);
      return;
    }

    const presentIds = new Set((presentResult.data || []).map((r) => r.member_id));
    const roster = (rosterResult.data || [])
      .filter((m) => !presentIds.has(m.id))
      .map((m) => ({
        id: m.id,
        name: m.name,
        position: (m as unknown as { positions: { name: string } | null }).positions?.name || null,
      }));

    setNotPresentMembers(roster);
  };

  const handleMarkPresent = async (memberId: string) => {
    if (!sessionId) return;
    setMarkingPresent(memberId);

    const { error } = await supabase.from('attendance_records').insert({
      session_id: sessionId,
      attendee_type: 'member',
      member_id: memberId,
      is_present: true,
      voter_pin: null,
    });

    if (error) {
      toast.error('Error al marcar presente');
      setMarkingPresent(null);
      return;
    }

    toast.success('Miembro marcado presente');
    loadStats(sessionId);
    loadRosterStatus(sessionId);
    setMarkingPresent(null);
  };

  const loadStats = async (sessId: string) => {
    const [votingMembersResult, attendanceResult] = await Promise.all([
      // Quórum estatutario: solo cuentan miembros activos con posición de derecho a voto
      // (positions.quorum_weight = 1). position_id null queda excluido por el inner join.
      supabase
        .from('members')
        .select('id, positions!inner(quorum_weight)')
        .eq('is_active', true)
        .eq('positions.quorum_weight', 1),
      supabase.from('attendance_records').select('*').eq('session_id', sessId).eq('is_present', true),
    ]);

    if (votingMembersResult.error) {
      console.error('Error counting members:', votingMembersResult.error);
      return;
    }
    const totalMembers = votingMembersResult.data?.length || 0;
    if (attendanceResult.error) {
      console.error('Error loading attendance:', attendanceResult.error);
      return;
    }

    const attendance = (attendanceResult.data || []) as AttendanceRow[];
    const presentMembers = attendance.filter(a => a.attendee_type === 'member').length;
    const presentGuests = attendance.filter(a => a.attendee_type === 'guest').length;

    const quorumRequired = QUORUM_FRACTION * 100; // ~66.6667%
    const membersNeededForQuorum = Math.ceil(QUORUM_FRACTION * totalMembers);
    const quorumAchieved = totalMembers > 0 && presentMembers >= membersNeededForQuorum;

    setStats({
      totalMembers,
      presentMembers,
      presentGuests,
      quorumRequired,
      quorumAchieved,
      // membersNeededForQuorum, // uncomment if you want to pass to QuorumStatus
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuorumStatus
          presentMembers={stats.presentMembers}
          totalMembers={stats.totalMembers}
          quorumRequired={stats.quorumRequired}
          quorumAchieved={stats.quorumAchieved}
          // membersNeededForQuorum={stats.membersNeededForQuorum} // if supported
        />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Miembros Presentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.presentMembers}</div>
            <p className="text-xs text-muted-foreground">de {stats.totalMembers} activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Invitados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.presentGuests}</div>
            <p className="text-xs text-muted-foreground">presentes ahora</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Miembros por Registrar ({notPresentMembers.length})</CardTitle>
          <CardDescription>
            Miembros activos que aún no han hecho check-in en esta sesión — marca presente sin llenar el formulario completo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notPresentMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Todos los miembros activos ya están presentes
            </div>
          ) : (
            <div className="space-y-2">
              {notPresentMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{member.name}</p>
                    {member.position && (
                      <p className="text-xs text-muted-foreground">{member.position}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleMarkPresent(member.id)}
                    disabled={markingPresent === member.id}
                  >
                    {markingPresent === member.id ? 'Marcando...' : 'Marcar Presente'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AttendanceManager
        sessionId={sessionId}
        onUpdate={() => {
          if (sessionId) {
            loadStats(sessionId);
            loadRosterStatus(sessionId);
          }
        }}
      />
    </div>
  );
};

export default Attendance;
