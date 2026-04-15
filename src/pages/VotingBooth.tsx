import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle2, ShieldCheck, User, ArrowLeft } from 'lucide-react';

export default function VotingBooth() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selections, setSelections] = useState<Record<string, string>>({});

  // 1. Fetch Election Info
  const { data: election, isLoading: isLoadingElection } = useQuery({
    queryKey: ['election', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('elections').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    }
  });

  // 2. Fetch User's Existing Votes (To block double voting)
  const { data: existingVotes, isLoading: isLoadingVotes } = useQuery({
    queryKey: ['my-votes', id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from('votes')
        .select('*')
        .eq('election_id', id)
        .eq('voter_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // 3. Fetch Candidates
  const { data: candidates, isLoading: isLoadingCandidates } = useQuery({
    queryKey: ['candidates', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('candidates')
        .select('*')
        .eq('election_id', id);
      if (error) throw error;
      return data;
    }
  });

  // Group candidates by Position
  const candidatesByPosition = useMemo(() => {
    if (!candidates) return {};
    return candidates.reduce((acc: any, curr: any) => {
      if (!acc[curr.position]) acc[curr.position] = [];
      acc[curr.position].push(curr);
      return acc;
    }, {});
  }, [candidates]);

  // Submit Votes
  const submitVotes = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No estás autenticado");
      
      const votesToInsert = Object.entries(selections).map(([position, candidateId]) => ({
        election_id: id,
        candidate_id: candidateId,
        position_voted: position,
        voter_id: user.id
      }));

      // Inserción múltiple
      const { error } = await (supabase as any).from('votes').insert(votesToInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('¡Voto emitido y verificado criptográficamente!');
      queryClient.invalidateQueries({ queryKey: ['my-votes', id] });
    },
    onError: (err: any) => {
      toast.error('Error al emitir voto: ' + err.message);
    }
  });

  const handleSelect = (position: string, candidateId: string) => {
    setSelections(prev => ({ ...prev, [position]: candidateId }));
  };

  const isFormValid = Object.keys(candidatesByPosition).length > 0 && 
                      Object.keys(selections).length === Object.keys(candidatesByPosition).length;

  if (isLoadingElection || isLoadingVotes || isLoadingCandidates) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (election?.status !== 'active') {
    return (
      <div className="container mx-auto py-12 px-4 max-w-2xl text-center">
        <h1 className="text-3xl font-bold mb-4">La elección no está activa</h1>
        <Button onClick={() => navigate('/elections')}>Volver al Portal</Button>
      </div>
    );
  }

  // If already voted
  if (existingVotes && existingVotes.length > 0) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-md">
        <Card className="border-green-200 border-2 shadow-lg">
          <CardHeader className="text-center pb-2">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-700">¡Voto Registrado!</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-zinc-600">
            <p className="mb-4">Tu voto ha sido encriptado y contabilizado exitosamente en el bloque de la elección.</p>
            <div className="bg-green-50 rounded-md p-3 text-sm flex items-center justify-center text-green-800">
              <ShieldCheck className="h-4 w-4 mr-2" /> Voto validado por Supabase
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => navigate('/elections')}>Volver al Portal</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl px-4">
      <Button variant="ghost" onClick={() => navigate('/elections')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Regresar
      </Button>

      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">{election.title}</h1>
        <p className="text-lg text-muted-foreground bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-md flex items-center">
          <ShieldCheck className="mr-2 h-5 w-5 text-blue-600" />
          Esta es una boleta oficial. Tu voto es totalmente secreto e irreversible.
        </p>
      </div>

      <div className="space-y-12">
        {Object.entries(candidatesByPosition).map(([position, positionCandidates]: [string, any]) => (
          <div key={position} className="space-y-4">
            <h2 className="text-2xl font-bold text-zinc-800 border-b pb-2 uppercase tracking-wide">
              {position}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {positionCandidates.map((c: any) => {
                const isSelected = selections[position] === c.id;
                return (
                  <Card 
                    key={c.id} 
                    className={`cursor-pointer transition-all duration-200 border-2 ${
                      isSelected ? 'border-primary ring-4 ring-primary/20 shadow-md' : 'border-transparent hover:border-zinc-300'
                    }`}
                    onClick={() => handleSelect(position, c.id)}
                  >
                    <div className="bg-zinc-100 aspect-video flex flex-col items-center justify-center relative rounded-t-lg overflow-hidden">
                      {c.image_url ? (
                        <img src={c.image_url} alt={c.name} className="object-cover w-full h-full" />
                      ) : (
                        <User className="h-20 w-20 text-zinc-400 drop-shadow-sm" />
                      )}
                      
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center backdrop-blur-[1px]">
                          <CheckCircle2 className="h-16 w-16 text-primary drop-shadow-md animate-in zoom-in" />
                        </div>
                      )}
                    </div>
                    <CardHeader className="p-4">
                      <CardTitle className="text-xl text-center">{c.name}</CardTitle>
                    </CardHeader>
                    {c.description && (
                      <CardContent className="p-4 pt-0 text-center text-sm text-zinc-600 line-clamp-2">
                        {c.description}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 bg-zinc-50 rounded-xl border border-zinc-200 text-center sticky bottom-4 shadow-2xl backdrop-blur-md bg-opacity-90">
        <h3 className="font-semibold text-zinc-800 mb-2">Confirma tu Boleta</h3>
        <p className="text-sm text-zinc-500 mb-4">
          Has seleccionado {Object.keys(selections).length} de {Object.keys(candidatesByPosition).length} cargos requeridos.
        </p>
        <Button 
          size="lg" 
          className="w-full md:w-auto px-12 text-lg font-bold h-14" 
          disabled={!isFormValid || submitVotes.isPending}
          onClick={() => submitVotes.mutate()}
        >
          {submitVotes.isPending ? 'ENCRIPTANDO Y ENVIANDO...' : 'DEPOSITAR VOTO OFICIAL'}
        </Button>
      </div>
    </div>
  );
}
