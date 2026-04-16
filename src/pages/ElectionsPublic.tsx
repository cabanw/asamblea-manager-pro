import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Vote, Calendar, Lock, Users } from 'lucide-react';

export default function ElectionsPublic() {
  const navigate = useNavigate();

  const { data: elections, isLoading } = useQuery({
    queryKey: ['public-elections'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('elections')
        .select('*')
        .neq('status', 'draft') // Only active and closed
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Portal de Elecciones</h1>
        <p className="text-muted-foreground">Ejerce tu derecho al voto de manera electrónica y segura.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : elections?.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground text-lg mb-2">No hay elecciones abiertas en este momento.</p>
            <Lock className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {elections?.map((election: any) => (
            <Card key={election.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${
                    election.status === 'active' ? 'bg-green-100 text-green-700 border-green-200 animate-pulse' :
                    election.status === 'nominating' ? 'bg-blue-100 text-blue-700 border-blue-200 animate-pulse' :
                    'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {election.status === 'active' ? 'EN CURSO - VOTACIÓN ABIERTA' : 
                     election.status === 'nominating' ? 'ABIERTA - FASE DE POSTULACIONES' : 'FINALIZADA'}
                  </span>
                </div>
                <CardTitle className="text-2xl">{election.title}</CardTitle>
                <CardDescription className="line-clamp-2">{election.description || 'Elección General'}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="text-sm text-muted-foreground flex items-center">
                  <Calendar className="mr-2 h-4 w-4" /> 
                  Aperturada: {new Date(election.created_at).toLocaleDateString()}
                </div>
              </CardContent>
              <CardFooter>
                {election.status === 'active' ? (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 font-semibold"
                    onClick={() => navigate(`/elections/${election.id}/vote`)}
                  >
                    <Vote className="mr-2 h-4 w-4" /> Entrar a Votar
                  </Button>
                ) : election.status === 'nominating' ? (
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 font-semibold"
                    onClick={() => navigate(`/elections/${election.id}/nominate`)}
                  >
                    <Users className="mr-2 h-4 w-4" /> Proponer Candidatos
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full border-slate-200 text-slate-700 hover:bg-slate-50"
                    onClick={() => navigate(`/elections/${election.id}/results`)}
                  >
                    Ver Resultados
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
