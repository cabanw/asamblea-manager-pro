import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, UserPlus, PlayCircle, StopCircle, User, Trash2 } from 'lucide-react';

type Election = {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'nominating' | 'active' | 'closed';
};

type Candidate = {
  id: string;
  name: string;
  position: string;
  description: string | null;
  image_url: string | null;
};

export default function ElectionDetailAdmin() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [isCandidateDialogOpen, setIsCandidateDialogOpen] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ name: '', position: '', description: '' });

  // Fetch Election
  const { data: election, isLoading: isLoadingElection } = useQuery({
    queryKey: ['election', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('elections')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Election;
    }
  });

  // Fetch Candidates
  const { data: candidates, isLoading: isLoadingCandidates } = useQuery({
    queryKey: ['candidates', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('candidates')
        .select('*')
        .eq('election_id', id)
        .order('position', { ascending: true });
      if (error) throw error;
      return data as Candidate[];
    }
  });

  // Fetch Nominations (Proposals)
  const { data: nominations, isLoading: isLoadingNominations } = useQuery({
    queryKey: ['nominations', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('nominations')
        .select('*')
        .eq('election_id', id);
      if (error) throw error;
      return data;
    }
  });

  // Agrupar nominaciones por puesto y nombre (Case insensitive y trim para mejor agrupación)
  const groupedNominations = useMemo(() => {
    if (!nominations) return [];
    const map: Record<string, { position: string, name: string, count: number }> = {};
    nominations.forEach((n: any) => {
      const cleanName = n.candidate_name.trim().toLowerCase();
      const key = `${n.position}|${cleanName}`;
      if (!map[key]) {
        map[key] = { position: n.position, name: n.candidate_name.trim(), count: 0 };
      }
      map[key].count++;
    });
    // Ordenar primero por posición, luego por popularidad desc
    return Object.values(map).sort((a, b) => {
       if (a.position === b.position) return b.count - a.count;
       return a.position.localeCompare(b.position);
    });
  }, [nominations]);

  // Mutations
  const updateStatus = useMutation({
    mutationFn: async (newStatus: 'draft' | 'nominating' | 'active' | 'closed') => {
      const { error } = await (supabase as any)
        .from('elections')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Estado de la elección actualizado');
      queryClient.invalidateQueries({ queryKey: ['election', id] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const deleteElection = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('elections')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Elección eliminada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['elections'] });
      navigate('/admin/elections');
    },
    onError: (err: any) => toast.error(err.message)
  });

  const addCandidate = useMutation({
    mutationFn: async (candidateOverride?: any) => {
      const payload = candidateOverride ? { ...candidateOverride, election_id: id } : { ...newCandidate, election_id: id };
      const { error } = await (supabase as any)
        .from('candidates')
        .insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Candidato registrado exitosamente');
      setIsCandidateDialogOpen(false);
      setNewCandidate({ name: '', position: '', description: '' });
      queryClient.invalidateQueries({ queryKey: ['candidates', id] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  if (isLoadingElection) return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!election) return <div className="text-center py-8">Elección no encontrada</div>;

  return (
    <div className="container mx-auto py-8">
      <Button variant="ghost" onClick={() => navigate('/admin/elections')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Elecciones
      </Button>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-3xl">{election.title}</CardTitle>
            <CardDescription>{election.description || 'Sin descripción'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 text-sm">
              <span className="font-semibold">Estado Actual:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                election.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' :
                election.status === 'closed' ? 'bg-zinc-100 text-zinc-700 border-zinc-200' :
                'bg-yellow-100 text-yellow-700 border-yellow-200'
              }`}>
                {election.status === 'active' ? 'En Curso (Votación Abierta)' : 
                 election.status === 'closed' ? 'Finalizada (Cerrada)' : 'Borrador'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Controles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {election.status === 'draft' && (
              <div className="space-y-3">
                <Button 
                  onClick={() => updateStatus.mutate('nominating')} 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <PlayCircle className="mr-2 h-4 w-4" /> Abrir Fase de Postulaciones
                </Button>
                <div className="text-center text-xs text-muted-foreground w-full">O puede saltar este paso y:</div>
                <Button 
                  onClick={() => updateStatus.mutate('active')} 
                  variant="outline"
                  className="w-full border-green-200 text-green-700 hover:bg-green-50"
                >
                  <PlayCircle className="mr-2 h-4 w-4" /> Iniciar Votación Directa
                </Button>
              </div>
            )}
            {election.status === 'nominating' && (
              <div className="space-y-3">
                <Button 
                  onClick={() => updateStatus.mutate('draft')} 
                  variant="secondary"
                  className="w-full"
                >
                  <StopCircle className="mr-2 h-4 w-4" /> Cerrar Postulaciones (Pausar)
                </Button>
                <Button 
                  onClick={() => updateStatus.mutate('active')} 
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <PlayCircle className="mr-2 h-4 w-4" /> Lanzar Elección Final (Votar)
                </Button>
              </div>
            )}
            {election.status === 'active' && (
              <Button 
                onClick={() => updateStatus.mutate('closed')} 
                variant="destructive"
                className="w-full"
              >
                <StopCircle className="mr-2 h-4 w-4" /> Finalizar Elección
              </Button>
            )}
            {election.status === 'closed' && (
              <Button 
                variant="outline" 
                className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={() => alert("Reportes en desarrollo")}
              >
                Ver Reportes Oficiales
              </Button>
            )}

            <div className="pt-4 mt-4 border-t border-zinc-200">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar Elección
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Eliminará permanentemente la elección y todos sus candidatos, votos y nominaciones asociados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => deleteElection.mutate()}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {deleteElection.isPending ? 'Eliminando...' : 'Sí, Eliminar'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center mb-6 mt-8">
        <h2 className="text-2xl font-bold tracking-tight">Candidatos Oficiales (Boleta)</h2>
        {(election.status === 'draft' || election.status === 'nominating') && (
          <Dialog open={isCandidateDialogOpen} onOpenChange={setIsCandidateDialogOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="mr-2 h-4 w-4" /> Agregar Candidato</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Candidato</DialogTitle>
                <DialogDescription>Añade los datos de la persona que participa en esta elección.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Nombre Completo</Label>
                  <Input 
                    placeholder="Ej. Juan Pérez" 
                    value={newCandidate.name}
                    onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cargo a Postular</Label>
                  <Input 
                    placeholder="Ej. Presidente" 
                    value={newCandidate.position}
                    onChange={(e) => setNewCandidate({ ...newCandidate, position: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción Breve</Label>
                  <Textarea 
                    placeholder="Experiencia, trayectoria..." 
                    value={newCandidate.description}
                    onChange={(e) => setNewCandidate({ ...newCandidate, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => addCandidate.mutate(undefined)} disabled={addCandidate.isPending || !newCandidate.name || !newCandidate.position}>
                  {addCandidate.isPending ? 'Guardando...' : 'Guardar Candidato'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoadingCandidates ? (
        <p>Cargando candidatos...</p>
      ) : candidates?.length === 0 ? (
        <Card className="text-center py-12 border-dashed bg-muted/30">
          <CardContent>
            <p className="text-muted-foreground text-lg">No hay candidatos en la boleta oficial aún.</p>
            {election.status === 'draft' && <p className="text-sm mt-2">Agrega candidatos para poder iniciar la votación.</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-12">
          {candidates?.map(candidate => (
            <Card key={candidate.id} className="overflow-hidden">
              <div className="bg-muted aspect-square flex items-center justify-center relative">
                {candidate.image_url ? (
                  <img src={candidate.image_url} alt={candidate.name} className="object-cover w-full h-full" />
                ) : (
                  <User className="h-20 w-20 text-muted-foreground/30" />
                )}
              </div>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-lg">{candidate.name}</CardTitle>
                <CardDescription className="font-medium text-primary">{candidate.position}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {candidate.description || 'Postulado por Asamblea'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* SECCIÓN DE POSTULACIONES DEL PÚBLICO */}
      <h2 className="text-2xl font-bold tracking-tight mb-6 pt-6 border-t border-zinc-200">
        Bandeja de Nombres Sugeridos por la Asamblea
      </h2>
      
      {isLoadingNominations ? (
        <p>Cargando sugerencias de la asamblea...</p>
      ) : groupedNominations.length === 0 ? (
        <Card className="text-center py-12 bg-blue-50/50 border-blue-100">
          <CardContent>
            <p className="text-blue-800 text-lg">La audiencia aún no ha enviado propuestas.</p>
            {election.status === 'nominating' && (
              <p className="text-sm mt-2 text-blue-600 animate-pulse">Cámara de postulaciones actualmente ABIERTA. Esperando respuestas...</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groupedNominations.map((group, index) => {
            // Check if already an official candidate
            const isOfficial = candidates?.some(
              c => c.name.toLowerCase() === group.name.toLowerCase() && c.position === group.position
            );

            return (
              <Card key={index} className={`border-l-4 ${isOfficial ? 'border-l-green-500 opacity-60' : 'border-l-blue-500'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{group.name}</CardTitle>
                  <CardDescription className="font-semibold text-blue-700">{group.position}</CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Sugerido {group.count} {group.count === 1 ? 'vez' : 'veces'}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant={isOfficial ? "secondary" : "default"}
                    className="w-full"
                    disabled={isOfficial || addCandidate.isPending}
                    onClick={() => {
                      addCandidate.mutate({ 
                        name: group.name, 
                        position: group.position, 
                        description: 'Aprobado desde sugerencias de asamblea.' 
                      });
                    }}
                  >
                    {isOfficial ? 'Ya está en la Boleta ✅' : 'Volver Candidato Oficial'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
