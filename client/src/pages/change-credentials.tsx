import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Home, Sparkles, Eye, EyeOff } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useLocation } from "wouter";

interface ChangeCredentialsData {
  newEmail: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ChangeCredentials() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<ChangeCredentialsData>({
    newEmail: "",
    newPassword: "",
    confirmPassword: "",
  });

  const changeMutation = useMutation({
    mutationFn: async (data: ChangeCredentialsData) => {
      if (data.newPassword !== data.confirmPassword) {
        throw new Error("As senhas não coincidem");
      }
      if (data.newPassword.length < 6) {
        throw new Error("A senha deve ter pelo menos 6 caracteres");
      }

      const res = await apiRequest('POST', '/api/change-credentials', {
        email: data.newEmail,
        password: data.newPassword,
      });
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['/api/user'], user);
      toast({
        title: "Credenciais atualizadas com sucesso",
        description: "Suas credenciais foram alteradas. Você será redirecionado.",
      });
      setTimeout(() => setLocation("/"), 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar credenciais",
        description: error.message || "Erro interno do servidor",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    changeMutation.mutate(formData);
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

        {/* Change Credentials Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-semibold text-gray-800">
              Alterar Credenciais
            </CardTitle>
            <p className="text-center text-gray-600 mt-2">
              Por segurança, você deve alterar suas credenciais padrão
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="newEmail">Novo E-mail</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={formData.newEmail}
                  onChange={(e) => setFormData({ ...formData, newEmail: e.target.value })}
                  placeholder="seu.novo@email.com"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="newPassword">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    placeholder="••••••••"
                    required
                    minLength={6}
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

              <div>
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit"
                className="w-full brand-gradient brand-gradient-hover text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200"
                disabled={changeMutation.isPending}
              >
                {changeMutation.isPending ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Alterando...
                  </>
                ) : (
                  "Alterar Credenciais"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}