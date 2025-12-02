import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ReportsSection } from '@/components/ReportsSection';

const AdminReports = () => {
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

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Reportes de Asamblea</h1>
      <ReportsSection sessionId={sessionId} stats={stats} />
    </div>
  );
};

export default AdminReports;
