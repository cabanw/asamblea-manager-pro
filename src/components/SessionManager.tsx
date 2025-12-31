import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Play, Check } from 'lucide-react';
import { format } from 'date-fns';

interface Session {
  id: string;
  name: string;
  date: string;
  status: string;
  quorum_required: number;
  start_time: string | null;
  end_time: string | null;
}

interface SessionManagerProps {
  currentSessionId: string | undefined;
  onSessionChange: (sessionId: string) => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({ currentSessionId, onSessionChange }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSession, setNewSession] = useState({
    name: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    quorum_required: 50,
  });

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    const { data, error } = await supabase
      .from('assembly_sessions')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      toast.error('Error loading sessions');
      return;
    }

    setSessions(data || []);
    setLoading(false);
  };

  const handleCreateSession = async () => {
    if (!newSession.name.trim()) {
      toast.error('Session name is required');
      return;
    }

    // End any active sessions first
    const { data: activeSessions, error: findError } = await supabase
      .from('assembly_sessions')
      .select('*')
      .eq('status', 'active');

    if (findError) {
      toast.error(`Failed to find active sessions: ${findError.message}`);
      return;
    }

    for (const session of activeSessions) {
      await handleEndSession(session, false); // End each active session without a toast message
    }

    const { data, error } = await supabase
      .from('assembly_sessions')
      .insert({
        name: newSession.name,
        date: newSession.date,
        quorum_required: newSession.quorum_required,
        status: 'active',
        start_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      toast.error(`Error creating session: ${error.message}`);
      return;
    }

    toast.success('New assembly session created');
    setDialogOpen(false);
    setNewSession({ name: '', date: format(new Date(), 'yyyy-MM-dd'), quorum_required: 50 });
    loadSessions();
    onSessionChange(data.id);
  };

  const handleEndSession = async (session: Session, showToast = true) => {
    if (!session.start_time) {
        toast.error('Cannot end a session that has not been started.');
        return;
    }

    const now = new Date();
    const startTime = new Date(session.start_time);
    
    const isSameDay = now.getFullYear() === startTime.getFullYear() &&
                    now.getMonth() === startTime.getMonth() &&
                    now.getDate() === startTime.getDate();

    let endTime;
    if (isSameDay) {
        endTime = now.toISOString();
    } else {
        const endOfDay = new Date(startTime);
        endOfDay.setHours(23, 59, 59, 999);
        endTime = endOfDay.toISOString();
    }

    const { error } = await supabase
      .from('assembly_sessions')
      .update({ status: 'completed', end_time: endTime })
      .eq('id', session.id);

    if (error) {
      if(showToast) toast.error(`Error ending session: ${error.message}`);
      return;
    }

    if(showToast) toast.success('Session ended');
    loadSessions();
    onSessionChange('');
  };

  const handleActivateSession = async (sessionId: string) => {
    // End any active sessions first
    const { data: activeSessions, error: findError } = await supabase
      .from('assembly_sessions')
      .select('*')
      .eq('status', 'active');

    if (findError) {
      toast.error(`Failed to find active sessions: ${findError.message}`);
      return;
    }

    for (const session of activeSessions) {
      await handleEndSession(session, false); // End each active session without a toast message
    }

    const { error } = await supabase
      .from('assembly_sessions')
      .update({ status: 'active', start_time: new Date().toISOString(), end_time: null })
      .eq('id', sessionId);

    if (error) {
      toast.error(`Error activating session: ${error.message}`);
      return;
    }

    toast.success('Session activated');
    loadSessions();
    onSessionChange(sessionId);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Assembly Management</CardTitle>
            <CardDescription>Create and manage assembly sessions</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Assembly
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Assembly</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Assembly Name</Label>
                  <Input
                    value={newSession.name}
                    onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                    placeholder="General Assembly"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newSession.date}
                    onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quorum Required (%)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={newSession.quorum_required}
                    onChange={(e) => setNewSession({ ...newSession, quorum_required: parseInt(e.target.value) || 50 })}
                  />
                </div>
                <Button onClick={handleCreateSession} className="w-full">
                  Create Assembly
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Quorum</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="font-medium">{session.name}</TableCell>
                <TableCell>{format(new Date(session.date), 'dd/MM/yyyy')}</TableCell>
                <TableCell>
                  <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                    {session.status === 'active' ? 'Active' : 'Completed'}
                  </Badge>
                </TableCell>
                <TableCell>{session.quorum_required}%</TableCell>
                <TableCell>
                  {session.status === 'active' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEndSession(session)}
                      className="gap-1"
                    >
                      <Check className="h-3 w-3" />
                      Finalize
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleActivateSession(session.id)}
                      className="gap-1"
                    >
                      <Play className="h-3 w-3" />
                      Activate
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};