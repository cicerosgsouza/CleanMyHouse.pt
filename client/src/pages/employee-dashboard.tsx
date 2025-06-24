import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, LogIn, LogOut, Home, CalendarDays, Download, MapPin } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { TimeRecordCard } from "@/components/time-record-card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import type { TimeRecord } from "@shared/schema";

export default function EmployeeDashboard() {
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [currentStatus, setCurrentStatus] = useState<'in' | 'out'>('out');
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: todayRecords = [], isLoading: todayLoading } = useQuery<TimeRecord[]>({
    queryKey: ['/api/time-records/today'],
  });

  const { data: monthlyRecords = [], isLoading: monthlyLoading } = useQuery<TimeRecord[]>({
    queryKey: ['/api/time-records/monthly', selectedMonth],
    enabled: !!selectedMonth,
  });

  // Determine current status based on latest record
  useEffect(() => {
    const sortedRecords = [...todayRecords].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    if (sortedRecords.length > 0) {
      const latestRecord = sortedRecords[0];
      setCurrentStatus(latestRecord.type === 'entry' ? 'in' : 'out');
    }
  }, [todayRecords]);

  const recordTimeMutation = useMutation({
    mutationFn: async (type: 'entry' | 'exit') => {
      return new Promise(async (resolve, reject) => {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                const { latitude, longitude } = position.coords;
                await apiRequest('POST', '/api/time-records', {
                  type,
                  latitude: latitude.toString(),
                  longitude: longitude.toString(),
                });
                resolve(null);
              } catch (error) {
                reject(error);
              }
            },
            async (error) => {
              console.warn('Geolocation failed:', error);
              // Record without location if geolocation fails
              try {
                await apiRequest('POST', '/api/time-records', { type });
                resolve(null);
              } catch (apiError) {
                reject(apiError);
              }
            },
            {
              timeout: 10000,
              enableHighAccuracy: true,
            }
          );
        } else {
          // No geolocation support, record without location
          try {
            await apiRequest('POST', '/api/time-records', { type });
            resolve(null);
          } catch (error) {
            reject(error);
          }
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-records/today'] });
      toast({
        title: "Sucesso",
        description: "Ponto registrado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao registrar ponto. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMonth) throw new Error('Mês não selecionado');
      
      const [month, year] = selectedMonth.split('-');
      const response = await fetch('/api/admin/reports/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          month: parseInt(month),
          year: parseInt(year),
          userId: user?.id,
          sendEmail: true,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao gerar relatório');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Relatório enviado por email!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao enviar relatório. Tente novamente.",
        variant: "destructive",
      });
    },
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

  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthValue = `${date.getMonth() + 1}-${date.getFullYear()}`;
      const monthLabel = date.toLocaleDateString('pt-BR', { 
        month: 'long', 
        year: 'numeric' 
      });
      
      options.push({ value: monthValue, label: monthLabel });
    }
    
    return options;
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
                <h1 className="text-xl font-semibold text-gray-900">Clean My House</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.firstName || user?.lastName ? 
                  `${user.firstName || ''} ${user.lastName || ''}`.trim() : 
                  user?.email || 'Usuário'
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
        {/* Status Card */}
        <Card className="shadow-lg mb-8">
          <CardContent className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Clock className="h-8 w-8 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Status Atual</h2>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Badge variant={currentStatus === 'in' ? 'default' : 'destructive'}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  currentStatus === 'in' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                {currentStatus === 'in' ? 'Em Expediente' : 'Fora do Expediente'}
              </Badge>
            </div>
            {todayRecords.length > 0 && (
              <p className="text-gray-600 text-sm">
                Último registro: {new Date(todayRecords[0].timestamp).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Button
            onClick={() => recordTimeMutation.mutate('entry')}
            disabled={recordTimeMutation.isPending}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white p-6 h-auto rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            <div className="text-center">
              {recordTimeMutation.isPending ? (
                <LoadingSpinner size="lg" className="mb-3 mx-auto" />
              ) : (
                <LogIn className="h-8 w-8 mb-3 mx-auto" />
              )}
              <h3 className="text-xl font-semibold mb-2">Registrar Entrada</h3>
              <p className="text-green-100 text-sm">Clique para marcar sua chegada</p>
            </div>
          </Button>

          <Button
            onClick={() => recordTimeMutation.mutate('exit')}
            disabled={recordTimeMutation.isPending}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-6 h-auto rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            <div className="text-center">
              {recordTimeMutation.isPending ? (
                <LoadingSpinner size="lg" className="mb-3 mx-auto" />
              ) : (
                <LogOut className="h-8 w-8 mb-3 mx-auto" />
              )}
              <h3 className="text-xl font-semibold mb-2">Registrar Saída</h3>
              <p className="text-red-100 text-sm">Clique para marcar sua saída</p>
            </div>
          </Button>
        </div>

        {/* Today's Records */}
        <Card className="shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarDays className="h-5 w-5 mr-2 text-pink-600" />
              Registros de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : todayRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum registro hoje</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayRecords.map((record) => (
                  <TimeRecordCard key={record.id} record={record} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Records */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <CalendarDays className="h-5 w-5 mr-2 text-pink-600" />
                Registros Mensais
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-6">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-48">
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

              <Button
                onClick={() => generateReportMutation.mutate()}
                disabled={!selectedMonth || generateReportMutation.isPending}
                className="brand-gradient brand-gradient-hover text-white"
              >
                {generateReportMutation.isPending ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Enviar Relatório
              </Button>
            </div>

            {!selectedMonth ? (
              <div className="text-center py-8 text-gray-500">
                <CalendarDays className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Selecione um mês para visualizar os registros</p>
              </div>
            ) : monthlyLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : monthlyRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CalendarDays className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum registro encontrado para este mês</p>
              </div>
            ) : (
              <div className="space-y-4">
                {monthlyRecords.map((record) => (
                  <TimeRecordCard key={record.id} record={record} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
