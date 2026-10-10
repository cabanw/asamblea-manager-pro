import { supabase } from '@/integrations/supabase/client';

// Quórum fijo por reglamento: 2/3 de los miembros activos con derecho a voto
// (is_active = true AND positions.quorum_weight = 1). No es configurable por sesión.
// El denominador es el total de ministros con voto, no los presentes: no cambia con
// "Marcar Salió" ni con check-ins de miembros sin voto.
export const QUORUM_FRACTION = 2 / 3;

export interface QuorumStats {
  totalMembers: number;
  presentMembers: number;
  presentGuests: number;
  membersNeededForQuorum: number;
  quorumAchieved: boolean;
}

type PresentRow = {
  attendee_type: string;
  members: { is_active: boolean | null; positions: { quorum_weight: number | null } | null } | null;
};

const isVotingMember = (row: PresentRow) =>
  row.attendee_type === 'member' &&
  row.members?.is_active === true &&
  row.members?.positions?.quorum_weight === 1;

// Única fuente del cálculo de quórum para Index, Attendance, Register y AdminReports.
// Devuelve null si alguna query falla, para que el caller conserve los stats previos.
export async function fetchQuorumStats(sessionId: string): Promise<QuorumStats | null> {
  const [votingMembersResult, attendanceResult] = await Promise.all([
    // position_id null queda excluido por el inner join.
    supabase
      .from('members')
      .select('id, positions!inner(quorum_weight)')
      .eq('is_active', true)
      .eq('positions.quorum_weight', 1),
    supabase
      .from('attendance_records')
      .select('attendee_type, members:member_id (is_active, positions:position_id (quorum_weight))')
      .eq('session_id', sessionId)
      .eq('is_present', true),
  ]);

  if (votingMembersResult.error || attendanceResult.error) {
    console.error('Error loading quorum stats:', votingMembersResult.error || attendanceResult.error);
    return null;
  }

  const attendance = (attendanceResult.data || []) as unknown as PresentRow[];
  const totalMembers = votingMembersResult.data?.length || 0;
  const presentMembers = attendance.filter(isVotingMember).length;
  const presentGuests = attendance.filter((a) => a.attendee_type === 'guest').length;
  const membersNeededForQuorum = Math.ceil(QUORUM_FRACTION * totalMembers);

  return {
    totalMembers,
    presentMembers,
    presentGuests,
    membersNeededForQuorum,
    quorumAchieved: totalMembers > 0 && presentMembers >= membersNeededForQuorum,
  };
}
