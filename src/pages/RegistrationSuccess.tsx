import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { MemberIdCard } from '../components/MemberIdCard';

const RegistrationSuccess = () => {
  const location = useLocation();
  const state = location.state as { name?: string; type?: string; position?: string; id_number?: string; voter_pin?: string } | null;

  const positionMap: Record<string, string> = {
    'president': 'Presidente',
    'vice_president': 'Vicepresidente',
    'secretary': 'Secretario/a',
    'treasurer': 'Tesorero/a',
    'board_member': 'Vocal',
    'member': 'Miembro General',
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 p-4">
      <div className="w-full max-w-md mx-auto space-y-6">
        <Card className="border-green-100 shadow-sm">
          <CardHeader className="bg-green-50/50 pb-4">
            <CardTitle className="text-center text-green-700">Registro Exitoso</CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-4">
            <p className="text-zinc-600">Su asistencia ha sido registrada exitosamente.</p>
            {!state && <p className="text-zinc-500 text-sm mt-2">Puede cerrar esta ventana de forma segura.</p>}
          </CardContent>
        </Card>
        
        {state && state.id_number && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
            <MemberIdCard 
              member={{
                id_number: state.id_number,
                name: state.name || "Invitado",
                organization: state.type === 'guest' 
                  ? 'Invitado' 
                  : (state.position ? positionMap[state.position] : 'Miembro Activo')
              }} 
            />
          </div>
        )}
        {state && state.voter_pin && (
          <div className="animate-in fade-in zoom-in duration-500 delay-300 fill-mode-both pt-4 w-full">
            <Card className="border-none shadow-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <CardHeader className="pb-2 text-center relative z-10">
                <CardTitle className="text-primary text-sm font-bold uppercase tracking-widest bg-white/50 inline-block px-4 py-1 rounded-full mx-auto shadow-sm">
                  Pin de Identidad Electoral
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-8 relative z-10">
                <div className="text-6xl font-black text-slate-800 tracking-[0.2em] mb-4 bg-white py-4 rounded-xl shadow-inner border border-zinc-100">
                  {state.voter_pin}
                </div>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded text-left text-sm text-blue-800 shadow-sm">
                  <p className="font-semibold mb-1">¡ATENCIÓN MIEMBRO!</p>
                  <p>Guarde este número o tome una captura de pantalla. Es su llave de acceso única para votar en su teléfono durante la asamblea.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrationSuccess;
