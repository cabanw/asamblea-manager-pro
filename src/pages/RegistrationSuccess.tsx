import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const RegistrationSuccess = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Registration Successful</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Your attendance has been successfully registered. You can now close this window.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegistrationSuccess;
