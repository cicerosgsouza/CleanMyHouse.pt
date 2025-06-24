import { Card, CardContent } from "@/components/ui/card";
import { Clock, MapPin } from "lucide-react";
import type { TimeRecord } from "@shared/schema";

interface TimeRecordCardProps {
  record: TimeRecord;
}

export function TimeRecordCard({ record }: TimeRecordCardProps) {
  const isEntry = record.type === 'entry';
  const time = new Date(record.timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Card className={`${
      isEntry ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              isEntry ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <div>
              <p className="font-medium text-gray-900">
                {isEntry ? 'Entrada' : 'Saída'}
              </p>
              {record.location && (
                <div className="flex items-center text-sm text-gray-600 mt-1">
                  <MapPin className="h-3 w-3 mr-1" />
                  <span className="truncate max-w-xs">{record.location}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center text-sm font-medium">
            <Clock className="h-4 w-4 mr-1" />
            <span className={isEntry ? 'text-green-600' : 'text-red-600'}>
              {time}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
