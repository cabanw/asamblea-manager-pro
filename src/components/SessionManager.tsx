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
import { Plus, Play, Square } from 'lucide-react';
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
    await supabase
      .from('assembly_sessions')
      .update({ status: 'completed', end_time: new Date().toISOString() })
      .eq('status', 'active');

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
      toast.error('Error creating session');
      return;
    }

    toast.success('New assembly session created');
    setDialogOpen(false);
    setNewSession({ name: '', date: format(new Date(), 'yyyy-MM-dd'), quorum_required: 50 });
    loadSessions();
    onSessionChange(data.id);
  };

  const handleEndSession = async (sessionId: string) => {
    const { error } = await supabase
      .from('assembly_sessions')
      .update({ status: 'completed', end_time: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) {
      toast.error('Error ending session');
      return;
    }

    toast.success('Session ended');
    loadSessions();
  };

  const handleActivateSession = async (sessionId: string) => {
    // End any active sessions first
    await supabase
      .from('assembly_sessions')
      .update({ status: 'completed', end_time: new Date().toISOString() })
      .eq('status', 'active');

    const { error } = await supabase
      .from('assembly_sessions')
      .update({ status: 'active', start_time: new Date().toISOString(), end_time: null })
      .eq('id', sessionId);

    if (error) {
      toast.error('Error activating session');
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
            <CardTitle>Gestión de Asambleas</CardTitle>
            <CardDescription>Crear y administrar sesiones de asamblea</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nueva Asamblea
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Asamblea</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre de la Asamblea</Label>
                  <Input
                    value={newSession.name}
                    onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                    placeholder="Asamblea General Ordinaria"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    value={newSession.date}
                    onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quorum Requerido (%)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={newSession.quorum_required}
                    onChange={(e) => setNewSession({ ...newSession, quorum_required: parseInt(e.target.value) || 50 })}
                  />
                </div>
                <Button onClick={handleCreateSession} className="w-full">
                  Crear Asamblea
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
              <TableHead>Nombre</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Quorum</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="font-medium">{session.name}</TableCell>
                <TableCell>{format(new Date(session.date), 'dd/MM/yyyy')}</TableCell>
                <TableCell>
                  <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                    {session.status === 'active' ? 'Activa' : 'Completada'}
                  </Badge>
                </TableCell>
                <TableCell>{session.quorum_required}%</TableCell>
                <TableCell>
                  {session.status === 'active' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEndSession(session.id)}
                      className="gap-1"
                    >
                      <Square className="h-3 w-3" />
                      Finalizar
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleActivateSession(session.id)}
                      className="gap-1"
                    >
                      <Play className="h-3 w-3" />
                      Activar
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
