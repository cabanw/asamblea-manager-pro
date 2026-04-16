import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CheckCircle2, ShieldCheck, User, ArrowLeft, KeyRound } from 'lucide-react';

export default function VotingBooth() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [pinInput, setPinInput] = useState('');
  const [verifiedPin, setVerifiedPin] = useState<string | null>(null);

  // 1. Fetch Election Info
  const { data: election, isLoading: isLoadingElection } = useQuery({
    queryKey: ['election', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('elections').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    }
  });

  // 2. Fetch User's Existing Votes (Requires Verified PIN)
  const { data: existingVotes, isLoading: isLoadingVotes } = useQuery({
    queryKey: ['my-votes', id, verifiedPin],
    queryFn: async () => {
      if (!verifiedPin) return [];
      const { data, error } = await (supabase as any)
        .from('votes')
        .select('*')
        .eq('election_id', id)
        .eq('voter_pin', verifiedPin);
      if (error) throw error;
      return data;
    },
    enabled: !!verifiedPin
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

  // PIN Verification Logic
  const verifyPinMutation = useMutation({
    mutationFn: async (pin: string) => {
      if (!pin) throw new Error("Ingrese un PIN válido");
      const { data, error } = await (supabase as any)
        .from('assembly_attendance')
        .select('voter_pin, attendee_type, full_name')
        .eq('voter_pin', pin.trim().toUpperCase())
        .single();
      
      if (error || !data) throw new Error("PIN Inválido o no asiste en este registro.");
      if (data.attendee_type !== 'member') throw new Error("Los invitados no tienen derecho al voto en la asamblea.");
      return data;
    },
    onSuccess: (data) => {
      setVerifiedPin(data.voter_pin);
      toast.success(`Identidad Confirmada: ${data.full_name}`);
    },
    onError: (err: any) => {
      toast.error('Acceso Denegado: ' + err.message);
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
      if (!verifiedPin) throw new Error("No estás autenticado con PIN");
      
      const votesToInsert = Object.entries(selections).map(([position, candidateId]) => ({
        election_id: id,
        candidate_id: candidateId,
        position_voted: position,
        voter_pin: verifiedPin
      }));

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

  if (isLoadingElection || isLoadingCandidates) {
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

  // --- STEP 1: LOGIN CON PIN ---
  if (!verifiedPin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] bg-zinc-50 p-4">
        <Button variant="ghost" onClick={() => navigate('/elections')} className="absolute top-24 left-4 sm:left-8">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
        <Card className="w-full max-w-sm shadow-xl border-primary/20">
          <CardHeader className="text-center pb-4 pt-8">
            <KeyRound className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl">Acceso a la Urna</CardTitle>
            <CardDescription>
              Introduce el PIN Secreto que te fue generado al registrar tu asistencia el día de hoy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input 
                id="pin" 
                autoComplete="off"
                placeholder="Ej. 129340" 
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="text-center text-3xl font-bold tracking-widest h-16 uppercase"
              />
            </div>
            <Button 
              className="w-full h-12 text-lg" 
              disabled={verifyPinMutation.isPending || pinInput.length < 3}
              onClick={() => verifyPinMutation.mutate(pinInput)}
            >
              {verifyPinMutation.isPending ? 'Validando...' : 'Entrar a Votar'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- STEP 2: ALREADY VOTED? ---
  if (isLoadingVotes) return <div className="text-center p-8">Cargando status electoral...</div>;

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
              <ShieldCheck className="h-4 w-4 mr-2" /> Voto asociado permanentemente a tu asistencia
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => navigate('/elections')}>Volver al Portal</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // --- STEP 3: BALLOT BOOTH ---
  return (
    <div className="container mx-auto py-8 max-w-4xl px-4">
      <Button variant="ghost" onClick={() => navigate('/elections')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Salir de la Urna
      </Button>

      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">{election.title}</h1>
        <p className="text-lg text-muted-foreground bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-md flex items-center">
          <ShieldCheck className="mr-2 h-5 w-5 text-blue-600" />
          Esta es una boleta oficial. Tú has sido verificado exitosamente mediante PIN de Asistencia.
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
