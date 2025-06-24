import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export default function Login() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--brand-light)' }}>
      <div className="max-w-md w-full">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-block p-6 brand-gradient rounded-2xl mb-4">
            <Home className="text-white text-4xl h-10 w-10" />
            <Sparkles className="text-white text-2xl h-6 w-6 ml-2 inline" />
          </div>
          <h1 className="text-3xl font-bold text-brand-gradient mb-2">
            Clean My House
          </h1>
          <p className="text-gray-600">Sistema de Registro de Ponto</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              Fazer Login
            </h2>
            
            <div className="space-y-6">
              <p className="text-center text-gray-600">
                Clique no botão abaixo para fazer login com sua conta Replit
              </p>
              
              <Button 
                onClick={handleLogin}
                className="w-full brand-gradient brand-gradient-hover text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105"
                disabled={isLoading}
              >
                {isLoading ? "Carregando..." : "Entrar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
