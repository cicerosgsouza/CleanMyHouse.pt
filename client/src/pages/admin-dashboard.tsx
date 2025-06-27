import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  LogIn, 
  LogOut, 
  Clock, 
  Home, 
  Eye, 
  UserCog, 
  BarChart3, 
  Settings,
  Download,
  Mail
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { RealTimeFeed } from "@/components/real-time-feed";
import { UserManagementTable } from "@/components/user-management-table";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
      console.error('Erro no logout:', error);
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

  const handleGenerateReport = async (sendEmail = false) => {
    if (!selectedReportMonth) {
      toast({
        title: "Erro",
        description: "Selecione um mês para gerar o relatório",
        variant: "destructive",
      });
      return;
    }

    try {
      const [month, year] = selectedReportMonth.split('-');

      if (sendEmail) {
        const response = await fetch('/api/admin/reports/monthly', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            month: parseInt(month),
            year: parseInt(year),
            sendEmail: true,
            format: reportFormat,
          }),
        });

        if (response.ok) {
          toast({
            title: "Sucesso",
            description: "Relatório enviado por email!",
          });
        } else {
          throw new Error('Erro ao enviar email');
        }
      } else {
        // Download CSV
        const response = await fetch('/api/admin/reports/monthly', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            month: parseInt(month),
            year: parseInt(year),
            sendEmail: false,
            format: reportFormat,
          }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `relatorio-${month}-${year}.${reportFormat === 'pdf' ? 'pdf' : 'csv'}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          toast({
            title: "Sucesso",
            description: "Relatório baixado com sucesso!",
          });
        } else {
          throw new Error('Erro ao gerar relatório');
        }
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
      const response = await fetch('/api/admin/time-records/month', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          month: deleteMonth,
          year: deleteYear,
          userIds: selectedUsers.length > 0 ? selectedUsers : undefined
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Sucesso",
          description: result.message || "Registros apagados com sucesso!",
        });
        setSelectedUsers([]);
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

  const handleSaveReportEmail = async () => {
    try {
      await apiRequest('POST', '/api/admin/settings', {
        key: 'report_email',
        value: reportEmail,
      });

      toast({
        title: "Sucesso",
        description: "Email salvo com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar email",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--brand-light)' }}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="inline-block p-2 brand-gradient rounded-lg">
                  <Home className="text-white h-5 w-5" />
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  Clean My House - Painel Administrativo
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.firstName || user?.lastName ? 
                  `${user.firstName || ''} ${user.lastName || ''}`.trim() : 
                  user?.email || 'Admin'
                }
              </span>
              <Button variant="ghost" onClick={handleLogout} className="text-gray-400 hover:text-gray-600">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
          <Card className="shadow-lg">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="text-green-600 h-4 w-4 sm:h-6 sm:w-6" />
                  </div>
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Funcionários Ativos</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">
                    {statsLoading ? <LoadingSpinner size="sm" /> : stats?.activeEmployees || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <LogIn className="text-blue-600 h-6 w-6" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Entradas Hoje</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statsLoading ? <LoadingSpinner size="sm" /> : stats?.todayEntries || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <LogOut className="text-red-600 h-6 w-6" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Saídas Hoje</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statsLoading ? <LoadingSpinner size="sm" /> : stats?.todayExits || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="text-yellow-600 h-6 w-6" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Em Expediente</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statsLoading ? <LoadingSpinner size="sm" /> : stats?.currentlyWorking || 0}
                  </p>
                </div>
              </div>
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Gerar Relatório Mensal</h3>

                    <div>
                      <Label htmlFor="reportMonth">Selecionar Mês</Label>
                      <Select value={selectedReportMonth} onValueChange={setSelectedReportMonth}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o mês" />
                        </SelectTrigger>
                        <SelectContent>
                          {generateMonthOptions().map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="reportFormat">Selecionar Formato</Label>
                      <Select value={reportFormat} onValueChange={setReportFormat}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o formato" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv">CSV</SelectItem>
                          <SelectItem value="pdf">PDF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex space-x-3">
                      <Button
                        onClick={() => handleGenerateReport(false)}
                        disabled={!selectedReportMonth}
                        className="flex-1 brand-gradient brand-gradient-hover text-white"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar {reportFormat.toUpperCase()}
                      </Button>

                      <Button
                        onClick={() => handleGenerateReport(true)}
                        disabled={!selectedReportMonth}
                        variant="outline"
                        className="flex-1"
                        title="Certifique-se de que o email está configurado no servidor"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Enviar Email
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Card className="bg-gray-50">
                      <CardHeader>
                        <CardTitle className="text-base">Informações do Relatório</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Formato:</span>
                            <span className="font-medium">{reportFormat.toUpperCase()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Conteúdo:</span>
                            <span className="font-medium">Todos os registros</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Inclui:</span>
                            <span className="font-medium">Nome, data, horários, locais</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Ordenação:</span>
                            <span className="font-medium">Por funcionário e data</span>
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
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <div className="space-y-6">
                  <Card className="bg-gray-50">
                    <CardHeader>
                      <CardTitle className="text-base">E-mail para Relatórios</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex space-x-4">
                        <Input
                          type="email"
                          value={reportEmail || emailSetting || ''}
                          onChange={(e) => setReportEmail(e.target.value)}
                          placeholder="admin@cleanmyhouse.com"
                          className="flex-1"
                        />
                        <Button 
                          onClick={handleSaveReportEmail}
                          className="brand-gradient brand-gradient-hover text-white"
                        >
                          Salvar
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Os relatórios mensais serão enviados para este endereço automaticamente.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-50">
                    <CardHeader>
                      <CardTitle className="text-base">Informações do Sistema</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sistema:</span>
                          <span className="font-medium">Clean My House v1.0</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Geolocalização:</span>
                          <Badge variant="default">Ativa</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Registros em tempo real:</span>
                          <Badge variant="default">Ativo</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Backup automático:</span>
                          <Badge variant="default">Ativo</Badge>
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