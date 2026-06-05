import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PositionManager } from '@/components/PositionManager';
import { SessionManager } from '@/components/SessionManager';
import { UserManager } from '@/components/UserManager';
import { PerformanceDashboard } from '@/components/PerformanceDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AdminSettings = () => {
  const [sessionId, setSessionId] = useState<string | undefined>();

  useEffect(() => {
    loadActiveSession();
  }, []);

  const loadActiveSession = async () => {
    const { data: existingSession } = await supabase
      .from('assembly_sessions')
      .select('id')
      .eq('status', 'active')
      .maybeSingle();

    if (existingSession) {
      setSessionId(existingSession.id);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Configuración</h1>
      
      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sessions">Asambleas</TabsTrigger>
          <TabsTrigger value="positions">Posiciones</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="performance">Rendimiento</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <SessionManager currentSessionId={sessionId} onSessionChange={setSessionId} />
        </TabsContent>

        <TabsContent value="positions">
          <PositionManager />
        </TabsContent>

        <TabsContent value="users">
          <UserManager />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
