import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

// El cargo no se pide aquí: register-attendance lo toma de la matrícula. Un miembro que no
// aparece en la matrícula queda como invitado y no cuenta para el quórum.
const PublicRegistration = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [type, setType] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !type) {
      toast({ variant: 'destructive', title: 'Error', description: 'Por favor complete todos los campos requeridos.' });
      return;
    }
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('register-attendance', {
        body: {
          token,
          name,
          phone,
          id_number: idNumber || undefined,
          type,
        },
      });

      if (error || !data?.success) {
        throw new Error('register-attendance failed');
      }

      if (!data.alreadyRegistered) {
        toast({ title: 'Éxito', description: 'Su asistencia ha sido registrada.' });
      }
      navigate('/registration-success', {
        state: {
          name,
          id_number: idNumber || null,
          positionName: data.positionName,
          voter_pin: data.voter_pin,
          is_active: data.is_active,
          alreadyRegistered: data.alreadyRegistered === true,
          treatedAsGuest: data.treatedAsGuest === true,
        },
      });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo completar el registro. Intente de nuevo o acérquese a la mesa de registro.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Registro de Asistencia</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ingrese su nombre completo"
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 787 555 1234"
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="id-number" className="block text-sm font-medium text-gray-700 mb-1">Número de ID (opcional)</label>
              <Input
                id="id-number"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="Ingrese su número de ID"
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Tipo de Asistente</label>
              <Select onValueChange={setType} value={type} disabled={isLoading}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Seleccione su opción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Miembro Activo</SelectItem>
                  <SelectItem value="guest">Invitado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full mt-6" disabled={isLoading}>
              {isLoading ? 'Registrando...' : 'Registrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicRegistration;
