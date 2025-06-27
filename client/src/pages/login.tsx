import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Home, Sparkles, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function Login() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [loginData, setLoginData] = useState({ email: "", password: "" });

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await apiRequest('POST', '/api/login', data);
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['/api/user'], user);
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo, ${user.firstName || user.email}!`,
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Erro no login",
        description: error.message || "Email ou senha incorretos",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
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
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    placeholder="••••••"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button 
                type="submit"
                className="w-full brand-gradient brand-gradient-hover text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
