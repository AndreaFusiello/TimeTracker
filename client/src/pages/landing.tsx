import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Clock className="mx-auto h-16 w-16 text-primary mb-4" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">TimeTracker Pro</h2>
          <p className="mt-2 text-sm text-gray-600">Sistema di gestione ore lavorative</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                Accedi per iniziare a registrare le tue ore lavorative
              </p>
              <Button onClick={handleLogin} className="w-full" size="lg">
                <Clock className="mr-2 h-4 w-4" />
                Accedi
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
