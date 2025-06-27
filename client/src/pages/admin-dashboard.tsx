import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Clock, 
  Home, 
  Eye, 
  UserCog, 
  BarChart3, 
  Settings,
  Download,
  Mail,
  FileText,
  Trash2
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { RealTimeFeed } from "@/components/real-time-feed";
import { UserManagementTable } from "@/components/user-management-table";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface AdminStats {
  activeEmployees: number;
  todayEntries: number;
  todayExits: number;
  currentlyWorking: number;
}

export default function AdminDashboard() {
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [deleteMonth, setDeleteMonth] = useState(new Date().getMonth() + 1);
  const [deleteYear, setDeleteYear] = useState(new Date().getFullYear());
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [reportEmail, setReportEmail] = useState("");

  const { user } = useAuth();
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: emailSetting } = useQuery({
    queryKey: ['/api/admin/settings/report_email'],
    select: (data) => data?.value || '',
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/";
    }
  };

  const handleDownloadReport = async () => {
    try {
      const response = await fetch('/api/admin/reports/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          month: reportMonth,
          year: reportYear,
          sendEmail: false,
          format: 'pdf',
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-${reportMonth}-${reportYear}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Sucesso",
          description: "Relatório PDF baixado com sucesso!",
        });
      } else {
        throw new Error('Erro ao gerar relatório');
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao baixar relatório",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRecords = async () => {
    try {
      const response = await fetch('/api/admin/delete-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          month: deleteMonth,
          year: deleteYear,
          userIds: selectedUsers.length > 0 ? selectedUsers : undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Sucesso",
          description: `${result.deletedCount} registros foram apagados.`,
        });
      } else {
        throw new Error('Erro ao apagar registros');
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao apagar registros",
        variant: "destructive",
      });
    }
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 to-white">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="brand-gradient p-2 rounded-lg">
                <Home className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
                <p className="text-sm text-gray-600">Clean My House - Sistema de Ponto</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName || user?.lastName ? 
                    `${user.firstName || ''} ${user.lastName || ''}`.trim() : 
                    user?.email
                  }
                </p>
                <p className="text-xs text-gray-500">Administrador</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="hover:bg-pink-50 hover:border-pink-300"
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Funcionários Ativos</CardTitle>
              <UserCog className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold brand-text">{stats?.activeEmployees || 0}</div>
              <p className="text-xs text-muted-foreground">Total de funcionários</p>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entradas Hoje</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.todayEntries || 0}</div>
              <p className="text-xs text-muted-foreground">Pontos de entrada</p>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saídas Hoje</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats?.todayExits || 0}</div>
              <p className="text-xs text-muted-foreground">Pontos de saída</p>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trabalhando Agora</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats?.currentlyWorking || 0}</div>
              <p className="text-xs text-muted-foreground">Funcionários em serviço</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Card className="shadow-lg">
          <Tabs defaultValue="realtime" className="w-full">
            <CardHeader className="pb-0">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 h-auto">
                <TabsTrigger value="realtime" className="flex flex-col sm:flex-row items-center justify-center text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5 h-auto min-h-[44px]">
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4 mb-1 sm:mb-0 sm:mr-2" />
                  <span className="text-center leading-tight">Tempo Real</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="flex flex-col sm:flex-row items-center justify-center text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5 h-auto min-h-[44px]">
                  <UserCog className="h-3 w-3 sm:h-4 sm:w-4 mb-1 sm:mb-0 sm:mr-2" />
                  <span className="text-center leading-tight">Usuários</span>
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex flex-col sm:flex-row items-center justify-center text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5 h-auto min-h-[44px]">
                  <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mb-1 sm:mb-0 sm:mr-2" />
                  <span className="text-center leading-tight">Relatórios</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex flex-col sm:flex-row items-center justify-center text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5 h-auto min-h-[44px]">
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4 mb-1 sm:mb-0 sm:mr-2" />
                  <span className="text-center leading-tight">Config</span>
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="p-6">
              <TabsContent value="realtime" className="space-y-6">
                <RealTimeFeed />
              </TabsContent>

              <TabsContent value="users" className="space-y-6">
                <UserManagementTable />
              </TabsContent>

              <TabsContent value="reports" className="space-y-6">
                <div className="grid gap-6">
                  {/* Seção de Gerar Relatório */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Gerar Relatório PDF
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <Label htmlFor="reportMonth">Mês</Label>
                          <Select value={reportMonth.toString()} onValueChange={(value) => setReportMonth(Number(value))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({length: 12}, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {new Date(2023, i).toLocaleDateString('pt-BR', { month: 'long' })}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <Label htmlFor="reportYear">Ano</Label>
                          <Select value={reportYear.toString()} onValueChange={(value) => setReportYear(Number(value))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({length: 10}, (_, i) => (
                                <SelectItem key={2020 + i} value={(2020 + i).toString()}>
                                  {2020 + i}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Button 
                        onClick={handleDownloadReport}
                        className="brand-gradient brand-gradient-hover text-white w-full"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Baixar Relatório PDF
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Seção de Apagar Registros */}
                  <Card className="border-red-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-700">
                        <Trash2 className="h-5 w-5" />
                        Apagar Registros
                      </CardTitle>
                      <p className="text-sm text-red-600">Atenção: Esta ação é permanente e não pode ser desfeita.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <Label htmlFor="deleteMonth">Mês</Label>
                          <Select value={deleteMonth.toString()} onValueChange={(value) => setDeleteMonth(Number(value))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({length: 12}, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {new Date(2023, i).toLocaleDateString('pt-BR', { month: 'long' })}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <Label htmlFor="deleteYear">Ano</Label>
                          <Select value={deleteYear.toString()} onValueChange={(value) => setDeleteYear(Number(value))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({length: 10}, (_, i) => (
                                <SelectItem key={2020 + i} value={(2020 + i).toString()}>
                                  {2020 + i}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>Funcionários (deixe vazio para todos)</Label>
                        <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                          {users?.map((user) => (
                            <div key={user.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`user-${user.id}`}
                                checked={selectedUsers.includes(user.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedUsers([...selectedUsers, user.id]);
                                  } else {
                                    setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                              <Label htmlFor={`user-${user.id}`} className="text-sm">
                                {user.firstName || user.lastName ? 
                                  `${user.firstName || ''} ${user.lastName || ''}`.trim() : 
                                  user.email
                                }
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button 
                        onClick={handleDeleteRecords}
                        variant="destructive"
                        className="w-full"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Apagar Registros
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <div className="space-y-6">
                  <Card className="bg-gray-50">
                    <CardHeader>
                      <CardTitle>Configurações do Sistema</CardTitle>
                      <CardDescription>
                        Configure as preferências do sistema de ponto eletrônico.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4">
                        <div>
                          <Label htmlFor="reportEmail">Email para Relatórios</Label>
                          <div className="flex gap-2 mt-1">
                            <input
                              id="reportEmail"
                              type="email"
                              value={reportEmail}
                              onChange={(e) => setReportEmail(e.target.value)}
                              placeholder="email@empresa.com"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                            />
                            <Button 
                              onClick={async () => {
                                try {
                                  await apiRequest('POST', '/api/admin/settings', {
                                    key: 'report_email',
                                    value: reportEmail
                                  });
                                  toast({
                                    title: "Sucesso",
                                    description: "Email configurado com sucesso",
                                  });
                                } catch (error) {
                                  toast({
                                    title: "Erro",
                                    description: "Erro ao salvar configuração",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              className="brand-gradient brand-gradient-hover text-white"
                            >
                              Salvar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="pt-4">
                      <div className="flex items-start space-x-2">
                        <Mail className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-yellow-800">Configuração de Email</p>
                          <p className="text-yellow-700 mt-1">
                            Para enviar relatórios por email, configure EMAIL_USER e EMAIL_PASS nas variáveis de ambiente do servidor.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}