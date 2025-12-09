import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AttendanceManager } from '@/components/AttendanceManager';
import { QuorumStatus } from '@/components/QuorumStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserPlus } from 'lucide-react';

const Attendance = () => {
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [stats, setStats] = useState({
    totalMembers: 0,
    presentMembers: 0,
    presentGuests: 0,
    quorumRequired: 50,
    quorumAchieved: false,
  });

  useEffect(() => {
    loadActiveSession();
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records',
          filter: `session_id=eq.${sessionId}`,
        },
        () => loadStats(sessionId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const loadActiveSession = async () => {
    const { data: existingSession } = await supabase
      .from('assembly_sessions')
      .select('*')
      .eq('status', 'active')
      .maybeSingle();

    if (existingSession) {
      setSessionId(existingSession.id);
      loadStats(existingSession.id);
    }
  };

  const loadStats = async (sessId: string) => {
    const [membersResult, attendanceResult] = await Promise.all([
      supabase.from('members').select('id', { count: 'exact' }).eq('is_active', true),
      supabase.from('attendance_records').select('*').eq('session_id', sessId).eq('is_present', true),
    ]);

    const totalMembers = membersResult.count || 0;
    const attendance = attendanceResult.data || [];
    const presentMembers = attendance.filter(a => a.attendee_type === 'member').length;
    const presentGuests = attendance.filter(a => a.attendee_type === 'guest').length;
    
    // Quorum is 2/3 (66.67%) of active members
    const quorumRequired = 66.67;
    const membersNeededForQuorum = Math.ceil((2 / 3) * totalMembers);
    const quorumAchieved = presentMembers >= membersNeededForQuorum;

    setStats({
      totalMembers,
      presentMembers,
      presentGuests,
      quorumRequired,
      quorumAchieved,
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

      <AttendanceManager sessionId={sessionId} onUpdate={() => sessionId && loadStats(sessionId)} />
    </div>
  );
};

export default Attendance;
