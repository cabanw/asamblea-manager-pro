import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, Calendar, ChevronRight } from 'lucide-react';

type Election = {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'active' | 'closed';
  created_at: string;
};

export default function AdminElections() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const { data: elections, isLoading } = useQuery({
    queryKey: ['elections'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('elections')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Election[];
    }
  });

  const createElection = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any)
        .from('elections')
        .insert([{ title, description, status: 'draft' }])
        .select()
        .single();
      
      if (error) throw error;
      return data as Election;
    },
    onSuccess: (data) => {
      toast.success('Elección creada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['elections'] });
      setIsDialogOpen(false);
      setTitle('');
      setDescription('');
      navigate(`/admin/elections/${data.id}`);
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return toast.error('El título es requerido');
    createElection.mutate();
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Elecciones</h1>
          <p className="text-muted-foreground">Sistema oficial de votación electrónica</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Nueva Elección</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Elección</DialogTitle>
              <DialogDescription>
                Define los detalles básicos para configurar una nueva votación.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título de la Elección</Label>
                  <Input 
                    id="title" 
                    placeholder="Ej. Elecciones Generales 2026" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción (Opcional)</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Propósito de las votaciones..." 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createElection.isPending}>
                  {createElection.isPending ? 'Creando...' : 'Crear y Continuar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : elections?.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground text-lg">No hay elecciones creadas aún.</p>
            <Button variant="outline" className="mt-4" onClick={() => setIsDialogOpen(true)}>Comenzar Primera Elección</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {elections?.map((election) => (
            <Card key={election.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/admin/elections/${election.id}`)}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl line-clamp-2">{election.title}</CardTitle>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                    election.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' :
                    election.status === 'closed' ? 'bg-zinc-100 text-zinc-700 border-zinc-200' :
                    'bg-yellow-100 text-yellow-700 border-yellow-200'
                  }`}>
                    {election.status === 'active' ? 'En Curso' : election.status === 'closed' ? 'Finalizada' : 'Borrador'}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground flex items-center mb-4">
                  <Calendar className="mr-2 h-4 w-4" /> 
                  Creado el {new Date(election.created_at).toLocaleDateString()}
                </div>
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" className="text-primary">
                    Gestionar <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
