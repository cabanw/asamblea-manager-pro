import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { FileEdit, ShieldCheck, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';

export default function NominationBooth() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [nominations, setNominations] = useState<Record<string, string>>({});
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

  // 2. Traer posiciones requeridas (cargos disponibles por defecto)
  const { data: positions, isLoading: isLoadingPositions } = useQuery({
    queryKey: ['positions'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('positions').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  // 3. Revisar si ya propuso antes
  const { data: existingNominations, isLoading: isLoadingSubmitted } = useQuery({
    queryKey: ['my-nominations', id, verifiedPin],
    queryFn: async () => {
      if (!verifiedPin) return [];
      const { data, error } = await (supabase as any)
        .from('nominations')
        .select('*')
        .eq('election_id', id)
        .eq('nominator_pin', verifiedPin);
      if (error) throw error;
      return data;
    },
    enabled: !!verifiedPin
  });

  // PIN Verification Logic
  const verifyPinMutation = useMutation({
    mutationFn: async (pin: string) => {
      if (!pin) throw new Error("Ingrese un PIN válido");
      const pinClean = pin.trim();

      // Buscar el PIN en attendance_records (sólo miembros presentes)
      const { data, error } = await (supabase as any)
        .from('attendance_records')
        .select('voter_pin, attendee_type, is_present, members:member_id (name)')
        .eq('voter_pin', pinClean)
        .eq('is_present', true)
        .maybeSingle();

      if (error || !data) throw new Error("PIN inválido. Verifica que tu registro de asistencia esté activo.");
      if (data.attendee_type !== 'member') throw new Error("Solo miembros activos pueden postular.");
      return { voter_pin: data.voter_pin, full_name: data.members?.name ?? 'Miembro' };
    },
    onSuccess: (data) => {
      setVerifiedPin(data.voter_pin);
      toast.success(`Identidad Confirmada: ${data.full_name}`);
    },
    onError: (err: any) => {
      toast.error('Acceso Denegado: ' + err.message);
    }
  });

  // Submit Nominations
  const submitNominations = useMutation({
    mutationFn: async () => {
      if (!verifiedPin) throw new Error("No estás autenticado con PIN");
      
      const payload = Object.entries(nominations)
        .filter(([_, name]) => name.trim() !== '')
        .map(([positionName, candidateName]) => ({
          election_id: id,
          candidate_name: candidateName.trim(),
          position: positionName,
          nominator_pin: verifiedPin
        }));

      if (payload.length === 0) throw new Error("Debes proponer al menos un nombre.");

      const { error } = await (supabase as any).from('nominations').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('¡Tus propuestas han sido enviadas a confidencialidad!');
      queryClient.invalidateQueries({ queryKey: ['my-nominations', id] });
    },
    onError: (err: any) => {
      toast.error('Error al enviar propuestas: ' + err.message);
    }
  });

  const handleInputChange = (positionName: string, value: string) => {
    setNominations(prev => ({ ...prev, [positionName]: value }));
  };

  if (isLoadingElection || isLoadingPositions) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (election?.status !== 'nominating') {
    return (
      <div className="container mx-auto py-12 px-4 max-w-2xl text-center">
        <h1 className="text-3xl font-bold mb-4">Fase de Postulación Cerrada</h1>
        <Button onClick={() => navigate('/elections')}>Volver al Portal</Button>
      </div>
    );
  }

  // --- LOGIN CON PIN ---
  if (!verifiedPin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] bg-zinc-50 p-4">
         <Button variant="ghost" onClick={() => navigate('/elections')} className="absolute top-24 left-4 sm:left-8">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
        <Card className="w-full max-w-sm shadow-xl border-blue-200">
          <CardHeader className="text-center pb-4 pt-8">
            <KeyRound className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Cámara de Propuestas</CardTitle>
            <CardDescription>
              Introduce el PIN Secreto generado en tu registro hoy para proponer candidatos.
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
              className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700" 
              disabled={verifyPinMutation.isPending || pinInput.length < 3}
              onClick={() => verifyPinMutation.mutate(pinInput)}
            >
              {verifyPinMutation.isPending ? 'Validando...' : 'Acceder'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingSubmitted) return <div className="text-center p-8">Validando estado...</div>;

  if (existingNominations && existingNominations.length > 0) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-md">
        <Card className="border-blue-200 border-2 shadow-lg">
          <CardHeader className="text-center pb-2">
            <CheckCircle2 className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-blue-700">¡Propuestas Registradas!</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-zinc-600">
            <p className="mb-4">Tus candidatos sugeridos han sido enviados al moderador de manera anónima y segura.</p>
            <div className="bg-blue-50 rounded-md p-3 text-sm flex items-center justify-center text-blue-800">
              <ShieldCheck className="h-4 w-4 mr-2" /> Un miembro solo propone una vez
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => navigate('/elections')}>Volver al Portal</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // --- BOOTH UI ---
  const validInputs = Object.values(nominations).filter(v => v.trim() !== '').length;

  return (
    <div className="container mx-auto py-8 max-w-2xl px-4">
      <Button variant="ghost" onClick={() => navigate('/elections')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Salir
      </Button>

      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-blue-900">Hoja de Postulación</h1>
        <p className="text-lg text-muted-foreground bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-md flex items-center">
          <FileEdit className="mr-2 h-5 w-5 text-blue-600" />
          Escribe el nombre de los hermanos/as que desearías postular. Tus propuestas son privadas.
        </p>
      </div>

      <div className="space-y-6">
        {positions?.map((pos: any) => (
          <Card key={pos.id} className="border-zinc-200">
            <CardHeader className="p-4 bg-zinc-50 border-b">
              <CardTitle className="text-lg uppercase text-zinc-700 tracking-wide">{pos.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Input 
                placeholder="Nombre completo del postulado (o deja en blanco)"
                className="h-12 text-lg"
                value={nominations[pos.name] || ''}
                onChange={(e) => handleInputChange(pos.name, e.target.value)}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 p-6 bg-white rounded-xl border border-zinc-200 text-center sticky bottom-4 shadow-2xl backdrop-blur-md bg-opacity-90">
        <h3 className="font-semibold text-zinc-800 mb-2">Enviar Sugerencias</h3>
        <p className="text-sm text-zinc-500 mb-4">
          Has completado propuestas para {validInputs} cargos. Tienes permitido dejarlos vacíos.
        </p>
        <Button 
          size="lg" 
          className="w-full md:w-auto px-12 text-lg font-bold h-14 bg-blue-600 hover:bg-blue-700" 
          disabled={validInputs === 0 || submitNominations.isPending}
          onClick={() => submitNominations.mutate()}
        >
          {submitNominations.isPending ? 'ENVIANDO...' : 'ENVIAR POSTULACIONES AL MODERADOR'}
        </Button>
      </div>
    </div>
  );
}
