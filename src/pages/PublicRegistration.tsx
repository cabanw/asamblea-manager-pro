import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

interface Position {
  id: string;
  name: string;
}

const PublicRegistration = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [type, setType] = useState('');
  const [positionId, setPositionId] = useState('');
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadPositions = async () => {
      const { data } = await supabase
        .from('positions')
        .select('id, name')
        .eq('quorum_weight', 1)
        .order('name');
      if (data) setPositions(data);
    };
    loadPositions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !type || (type === 'member' && !positionId)) {
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
          position_id: type === 'member' ? positionId : null,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({ title: 'Éxito', description: 'Su asistencia ha sido registrada.' });
      navigate('/registration-success', {
        state: {
          name,
          id_number: idNumber || null,
          positionName: data?.positionName,
          voter_pin: data?.voter_pin,
          is_active: data?.is_active,
        },
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo registrar la asistencia.' });
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

            {type === 'member' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Credencial / Categoría de Miembro</label>
                <Select onValueChange={setPositionId} value={positionId} disabled={isLoading}>
                  <SelectTrigger id="position">
                    <SelectValue placeholder="Seleccione su credencial" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((position) => (
                      <SelectItem key={position.id} value={position.id}>
                        {position.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
