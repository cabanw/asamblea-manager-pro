import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

const PublicRegistration = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [position, setPosition] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !type || (type === 'member' && !position)) {
      toast({ variant: 'destructive', title: 'Error', description: 'Por favor complete todos los campos requeridos.' });
      return;
    }
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('register-attendance', {
        body: { token, name, type, position: type === 'member' ? position : null },
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({ title: 'Éxito', description: 'Su asistencia ha sido registrada.' });
      navigate('/registration-success', { state: { name, type, position, id_number: token, voter_pin: data?.voter_pin } }); 
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
                <Select onValueChange={setPosition} value={position} disabled={isLoading}>
                  <SelectTrigger id="position">
                    <SelectValue placeholder="Seleccione su credencial" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ministro_ordenado">Ministro Ordenado</SelectItem>
                    <SelectItem value="ministro_licenciado">Ministro Licenciado</SelectItem>
                    <SelectItem value="ministro_certificado">Ministro Certificado</SelectItem>
                    <SelectItem value="delegado_pastor">Delegado (Pastor)</SelectItem>
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
