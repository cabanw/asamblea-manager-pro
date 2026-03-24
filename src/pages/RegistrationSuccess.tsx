import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { MemberIdCard } from '../components/MemberIdCard';

const RegistrationSuccess = () => {
  const location = useLocation();
  const state = location.state as { name?: string; type?: string; id_number?: string } | null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 p-4">
      <div className="w-full max-w-md mx-auto space-y-6">
        <Card className="border-green-100 shadow-sm">
          <CardHeader className="bg-green-50/50 pb-4">
            <CardTitle className="text-center text-green-700">Registration Successful</CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-4">
            <p className="text-zinc-600">Your attendance has been successfully registered.</p>
            {!state && <p className="text-zinc-500 text-sm mt-2">You can now safely close this window.</p>}
          </CardContent>
        </Card>
        
        {state && state.id_number && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
            <MemberIdCard 
              member={{
                id_number: state.id_number,
                name: state.name || "Guest",
                organization: state.type === 'guest' ? 'Guest Attendee' : 'Registered Minister'
              }} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrationSuccess;
