import { Card, CardContent } from "@/components/ui/card";
import { Github, Linkedin, Mail, ArrowLeft, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function AboutDeveloper() {
  const navigate = useNavigate();
  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 hover:bg-slate-100">
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver
      </Button>
      <Card className="overflow-hidden shadow-2xl border-0 bg-white ring-1 ring-slate-100">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            {/* Left side: Logo & Branding */}
            <div className="md:w-2/5 bg-gradient-to-b from-blue-50 to-white p-10 flex flex-col items-center justify-center border-r border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-blue-100 rounded-full opacity-50 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 bg-blue-200 rounded-full opacity-30 blur-2xl"></div>
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="bg-white p-4 rounded-xl shadow-sm mb-8 w-full flex justify-center">
                  {/* Se buscará en la carpeta public/ */}
                  <img 
                    src="/developer-logo.png" 
                    alt="WC - Wilfredo Caban Software Developer" 
                    className="w-full max-w-[200px] object-contain drop-shadow-sm hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      // Fallback visual si la imagen no está presente
                      e.currentTarget.style.display = 'none';
                      document.getElementById('logo-fallback')?.classList.remove('hidden');
                    }}
                  />
                  <div id="logo-fallback" className="hidden flex-col items-center text-center">
                    <Code2 className="h-16 w-16 text-blue-600 mb-2" />
                    <span className="font-black text-2xl tracking-tighter text-slate-800">WC</span>
                  </div>
                </div>
                
                <h2 className="text-2xl font-black text-slate-800 text-center tracking-tight">WILFREDO CABAN</h2>
                <div className="h-1 w-12 bg-blue-600 rounded-full my-3"></div>
                <p className="text-blue-700 font-bold tracking-[0.2em] text-xs uppercase text-center">
                  Software Developer
                </p>
              </div>
            </div>
            
            {/* Right side: Info */}
            <div className="md:w-3/5 p-8 md:p-12 bg-white relative">
              <h1 className="text-3xl font-extrabold text-slate-900 mb-6 tracking-tight">
                Developer Notes
              </h1>
              
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-600 leading-relaxed mb-6 text-lg">
                  El <strong>Asamblea Manager Pro</strong> fue diseñado y desarrollado a la medida para resolver los retos de logística, asistencia y votación segura durante las sesiones de asamblea.
                </p>
                
                <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-blue-600" />
                    Arquitectura del Sistema
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1.5 bg-white shadow-sm border border-slate-200 text-slate-700 rounded-md text-sm font-medium">React + Vite</span>
                    <span className="px-3 py-1.5 bg-white shadow-sm border border-slate-200 text-slate-700 rounded-md text-sm font-medium">TypeScript</span>
                    <span className="px-3 py-1.5 bg-white shadow-sm border border-slate-200 text-slate-700 rounded-md text-sm font-medium">Tailwind CSS</span>
                    <span className="px-3 py-1.5 bg-white shadow-sm border border-slate-200 text-slate-700 rounded-md text-sm font-medium">Supabase Auth & DB</span>
                    <span className="px-3 py-1.5 bg-white shadow-sm border border-slate-200 text-slate-700 rounded-md text-sm font-medium">Realtime Subscriptions</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-auto pt-6 border-t border-slate-100">
                <Button variant="default" className="gap-2 bg-slate-900 hover:bg-slate-800 text-white" onClick={() => window.open('https://github.com/cabanw')}>
                  <Github className="h-4 w-4" /> /cabanw
                </Button>
                <Button variant="outline" className="gap-2 border-slate-200 hover:bg-slate-50 text-slate-700" onClick={() => window.open('mailto:contacto@ejemplo.com')}>
                  <Mail className="h-4 w-4" /> Contactar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
