import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Activity, CheckCircle } from 'lucide-react';
import FiadahLogo from '@/assets/FIADAH_Logo.jpg';

export default function ElectionResults() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [realtimeTrigger, setRealtimeTrigger] = useState(0);

  // Fetch Election Details
  const { data: election, isLoading: isLoadingElection } = useQuery({
    queryKey: ['election', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('elections').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    }
  });

  // Fetch Results using secure RPC
  const { data: rawResults, isLoading: isLoadingResults, refetch } = useQuery({
    queryKey: ['election-results', id, realtimeTrigger],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_election_results', { p_election_id: id });
      if (error) throw error;
      return data;
    }
  });

  // Real-time subscription to votes table
  useEffect(() => {
    if (!election || election.status !== 'active') return;

    const channel = supabase.channel('votes_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes', filter: `election_id=eq.${id}` }, () => {
        setRealtimeTrigger(prev => prev + 1);
        refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [election, id, refetch]);

  if (isLoadingElection || isLoadingResults) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  // Format results to group by position
  const resultsByPosition = rawResults?.reduce((acc: any, curr: any) => {
    if (!acc[curr.candidate_position]) acc[curr.candidate_position] = { totalVotes: 0, candidates: [] };
    acc[curr.candidate_position].candidates.push(curr);
    acc[curr.candidate_position].totalVotes += Number(curr.vote_count);
    return acc;
  }, {}) || {};

  return (
    <div className="container mx-auto py-8 max-w-5xl px-4">
      {/* Hide controls when printing */}
      <div className="print:hidden flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={() => navigate('/elections')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Portal
        </Button>
        {election?.status === 'closed' && (
          <Button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-900">
            <Printer className="mr-2 h-4 w-4" /> Imprimir Reporte Oficial
          </Button>
        )}
      </div>

      <div className="mb-8 text-center sm:text-left print:text-center print:border-b-4 print:border-slate-800 print:pb-6 print:mb-12">
        <div className="hidden print:flex justify-center mb-6">
           <img src={FiadahLogo} alt="Logo" className="h-24 w-auto grayscale" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 uppercase">{election?.title}</h1>
        {election?.status === 'active' ? (
          <div className="inline-flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-semibold print:hidden">
            <Activity className="h-4 w-4 mr-2 animate-pulse" /> Conteo en Tiempo Real
          </div>
        ) : (
          <div className="inline-flex items-center text-slate-700 bg-slate-100 px-3 py-1 rounded-full text-sm font-semibold print:text-black print:bg-transparent print:border">
            <CheckCircle className="h-4 w-4 mr-2" /> Votación Finalizada - Resultados Oficiales Certificados
          </div>
        )}
      </div>

      <div className="space-y-10">
        {Object.entries(resultsByPosition).map(([position, data]: [string, any]) => (
          <Card key={position} className="border-t-4 border-t-primary shadow-md print:shadow-none print:border-t-2 print:border-t-black print:mb-8 print:break-inside-avoid">
            <CardHeader className="bg-muted/30 pb-4 print:bg-transparent">
              <div className="flex justify-between items-end">
                <CardTitle className="text-2xl uppercase tracking-wider">{position}</CardTitle>
                <CardDescription className="font-semibold text-lg print:text-black">
                  Total Votos: {data.totalVotes}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {data.candidates.map((candidate: any, index: number) => {
                  const percentage = data.totalVotes > 0 ? ((Number(candidate.vote_count) / data.totalVotes) * 100).toFixed(1) : 0;
                  const isWinner = election?.status === 'closed' && index === 0 && candidate.vote_count > 0;
                  
                  return (
                    <div key={candidate.candidate_id} className="relative">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <span className={`font-semibold text-lg ${isWinner ? 'text-primary' : 'text-zinc-800'} print:text-black`}>
                            {candidate.candidate_name}
                          </span>
                          {isWinner && <CheckCircle className="ml-2 h-5 w-5 text-green-500 print:text-black" />}
                        </div>
                        <span className="font-bold text-lg">{candidate.vote_count} votos ({percentage}%)</span>
                      </div>
                      
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200 print:border-black">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${
                            isWinner ? 'bg-green-500' : 'bg-primary/80'
                          } print:bg-black print:bg-opacity-80`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
        {Object.keys(resultsByPosition).length === 0 && (
          <p className="text-center text-muted-foreground py-8">Aún no hay resultados para esta elección.</p>
        )}
      </div>
      
      {/* Print Footer */}
      <div className="hidden print:block mt-24 text-center border-t pt-8">
        <p className="text-sm text-zinc-500">Documento Generado por Asamblea Manager Pro</p>
        <p className="text-sm text-zinc-500">{new Date().toLocaleString()}</p>
        
        <div className="mt-16 flex justify-around">
          <div className="border-t border-black w-48 pt-2">Firma Autorizada 1</div>
          <div className="border-t border-black w-48 pt-2">Firma Autorizada 2</div>
        </div>
      </div>
    </div>
  );
}
