import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut, MapPin, User as UserIcon } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { TimeRecord, User } from "@shared/schema";

interface RecentRecord extends TimeRecord {
  user: User;
}

export function RealTimeFeed() {
  const { data: records = [], isLoading } = useQuery<RecentRecord[]>({
    queryKey: ['/api/admin/recent-records'],
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'agora mesmo';
    if (minutes === 1) return 'há 1 minuto';
    if (minutes < 60) return `há ${minutes} minutos`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return 'há 1 hora';
    if (hours < 24) return `há ${hours} horas`;
    
    return time.toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="h-5 w-5 mr-2 text-pink-600" />
          Atividade em Tempo Real
        </CardTitle>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhuma atividade recente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((record) => {
              const isEntry = record.type === 'entry';
              const userName = `${record.user.firstName || ''} ${record.user.lastName || ''}`.trim() || 
                             record.user.email || 'Usuário';
              
              return (
                <div
                  key={record.id}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg ${
                    isEntry ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-center space-x-4 mb-2 sm:mb-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isEntry ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {isEntry ? (
                        <LogIn className={`h-5 w-5 ${isEntry ? 'text-green-600' : 'text-red-600'}`} />
                      ) : (
                        <LogOut className={`h-5 w-5 ${isEntry ? 'text-green-600' : 'text-red-600'}`} />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900 text-sm sm:text-base">{userName}</span>
                        <Badge variant={isEntry ? 'default' : 'destructive'} className="text-xs">
                          {isEntry ? 'Entrada' : 'Saída'}
                        </Badge>
                      </div>
                      
                      {record.location && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{record.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex sm:flex-col sm:text-right">
                    <p className="text-sm font-medium text-gray-900 mr-2 sm:mr-0">
                      {new Date(record.timestamp).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatTimeAgo(record.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
