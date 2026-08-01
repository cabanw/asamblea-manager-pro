import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, FileText, Users, ClipboardList, Home, Vote, UserCog } from 'lucide-react';
import FiadahLogo from '@/assets/FIADAH_Logo.jpg';
import { VOTING_ENABLED } from '@/lib/featureFlags';

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, isAdmin, isAssemblySergeant, isSecretary } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActive = (path: string) => location.pathname === path;

  if (!user) return null;

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <img 
              src={FiadahLogo} 
              alt="FIADAH Logo" 
              className="h-10 w-auto cursor-pointer" 
              onClick={() => navigate('/')}
            />
            <span className="font-semibold text-lg hidden sm:block">Sistema de Asamblea</span>
          </div>

          <nav className="flex items-center gap-1">
            <Button
              variant={isActive('/') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Inicio</span>
            </Button>

            <Button
              variant={isActive('/register') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/register')}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Registro</span>
            </Button>

            {isAssemblySergeant && (
              <Button
                variant={isActive('/attendance') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/attendance')}
                className="gap-2"
              >
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Asistencia</span>
              </Button>
            )}

            {(isAdmin || isAssemblySergeant || isSecretary) && (
              <Button
                variant={isActive('/members') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/members')}
                className="gap-2"
              >
                <UserCog className="h-4 w-4" />
                <span className="hidden sm:inline">Miembros</span>
              </Button>
            )}

            {VOTING_ENABLED && (
              <Button
                variant={isActive('/elections') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/elections')}
                className="gap-2"
              >
                <Vote className="h-4 w-4" />
                <span className="hidden sm:inline">Portal de Votos</span>
              </Button>
            )}

            {isAdmin && (
              <>
                {VOTING_ENABLED && (
                  <Button
                    variant={isActive('/admin/elections') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => navigate('/admin/elections')}
                    className="gap-2"
                  >
                    <Vote className="h-4 w-4" />
                    <span className="hidden sm:inline">Elecciones</span>
                  </Button>
                )}

                <Button
                  variant={isActive('/admin/reports') ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => navigate('/admin/reports')}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Reportes</span>
                </Button>

                <Button
                  variant={isActive('/admin/settings') ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => navigate('/admin/settings')}
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Configuración</span>
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};
