import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QuorumStatus } from '@/components/QuorumStatus';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardList, LogIn, UserPlus, Users } from 'lucide-react';

const QUORUM_THRESHOLD = 2 / 3;

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [sessionName, setSessionName] = useState<string>('');
  const [stats, setStats] = useState({
    totalMembers: 0,
    presentMembers: 0,
    presentGuests: 0,
    quorumRequired: QUORUM_THRESHOLD * 100,
    quorumAchieved: false,
  });

  useEffect(() => {
    loadActiveSession();
  }, []);

  const loadActiveSession = async () => {
    const { data: session } = await supabase
      .from('assembly_sessions')
      .select('*')
      .eq('status', 'active')
      .maybeSingle();

    if (session) {
      setSessionName(session.name);
      loadStats(session.id);
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
    
    const quorumAchieved = totalMembers > 0 && (presentMembers / totalMembers) >= QUORUM_THRESHOLD;

    setStats(prevStats => ({
      ...prevStats,
      totalMembers,
      presentMembers,
      presentGuests,
      quorumAchieved,
    }));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Sistema de Asamblea</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">Bienvenido. Inicia sesión para continuar.</p>
            <Button onClick={() => navigate('/auth')} className="w-full gap-2">
              <LogIn className="h-4 w-4" />
              Iniciar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {sessionName && (
        <div className="text-center">
          <h1 className="text-2xl font-bold">{sessionName}</h1>
          <p className="text-muted-foreground">Sesión activa</p>
        </div>
      )}

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
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate('/register')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Registro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Registrar miembros e invitados</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate('/attendance')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Asistencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Gestionar asistencia</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
