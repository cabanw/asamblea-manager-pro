import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RegisterMember } from '@/components/RegisterMember';
import { RegisterGuest } from '@/components/RegisterGuest';
import { QuorumStatus } from '@/components/QuorumStatus';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserPlus } from 'lucide-react';

const Register = () => {
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [stats, setStats] = useState({
    totalMembers: 0,
    presentMembers: 0,
    totalGuests: 0,
    presentGuests: 0,
    quorumRequired: 50,
    quorumAchieved: false,
  });

  useEffect(() => {
    loadActiveSession();
  }, []);

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
    const [membersResult, attendanceResult, sessionResult] = await Promise.all([
      supabase.from('members').select('id', { count: 'exact' }).eq('is_active', true),
      supabase.from('attendance_records').select('*').eq('session_id', sessId).eq('is_present', true),
      supabase.from('assembly_sessions').select('quorum_required').eq('id', sessId).single(),
    ]);

    const totalMembers = membersResult.count || 0;
    const attendance = attendanceResult.data || [];
    const presentMembers = attendance.filter(a => a.attendee_type === 'member').length;
    const presentGuests = attendance.filter(a => a.attendee_type === 'guest').length;
    const quorumRequired = sessionResult.data?.quorum_required || 50;
    const quorumPercentage = totalMembers > 0 ? (presentMembers / totalMembers) * 100 : 0;

    setStats({
      totalMembers,
      presentMembers,
      totalGuests: presentGuests,
      presentGuests,
      quorumRequired,
      quorumAchieved: quorumPercentage >= quorumRequired,
    });
  };

  const handleSuccess = () => {
    if (sessionId) {
      loadStats(sessionId);
    }
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
              Invitados Presentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.presentGuests}</div>
            <p className="text-xs text-muted-foreground">registrados hoy</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="member" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="member">Registrar Miembro</TabsTrigger>
          <TabsTrigger value="guest">Registrar Invitado</TabsTrigger>
        </TabsList>
        
        <TabsContent value="member">
          <RegisterMember sessionId={sessionId} onSuccess={handleSuccess} />
        </TabsContent>
        
        <TabsContent value="guest">
          <RegisterGuest sessionId={sessionId} onSuccess={handleSuccess} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Register;
