import { storage } from '../storage';
import type { TimeRecord, User } from '@shared/schema';

interface ReportData {
  funcionario: string;
  data: string;
  horaEntrada: string;
  localEntrada: string;
  horaSaida: string;
  localSaida: string;
  horasTrabalhadas: string;
}

export class ReportsService {
  async generateMonthlyReport(month: number, year: number, userId?: string): Promise<Buffer> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    let records: (TimeRecord & { user: User })[];
    
    if (userId) {
      const userRecords = await storage.getUserTimeRecords(userId, startDate, endDate);
      const user = await storage.getUser(userId);
      records = userRecords.map(record => ({ ...record, user: user! }));
    } else {
      records = await storage.getAllTimeRecords(startDate, endDate);
    }

    // Group records by user and date
    const groupedRecords = this.groupRecordsByUserAndDate(records);
    
    // Generate CSV content
    const csvContent = this.generateCSV(groupedRecords);
    
    return Buffer.from(csvContent, 'utf-8');
  }

  private groupRecordsByUserAndDate(records: (TimeRecord & { user: User })[]): ReportData[] {
    const grouped = new Map<string, Map<string, { entries: TimeRecord[], exits: TimeRecord[] }>>();

    // Group by user and date
    records.forEach(record => {
      const userId = record.userId;
      const userName = `${record.user.firstName || ''} ${record.user.lastName || ''}`.trim() || record.user.email || 'Usuário Desconhecido';
      const date = record.timestamp.toISOString().split('T')[0];
      const key = `${userId}-${userName}`;

      if (!grouped.has(key)) {
        grouped.set(key, new Map());
      }

      const userRecords = grouped.get(key)!;
      if (!userRecords.has(date)) {
        userRecords.set(date, { entries: [], exits: [] });
      }

      const dayRecords = userRecords.get(date)!;
      if (record.type === 'entry') {
        dayRecords.entries.push(record);
      } else {
        dayRecords.exits.push(record);
      }
    });

    // Convert to report data
    const reportData: ReportData[] = [];
    
    grouped.forEach((userRecords, userKey) => {
      const userName = userKey.split('-').slice(1).join('-');
      
      userRecords.forEach((dayRecords, date) => {
        const entries = dayRecords.entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const exits = dayRecords.exits.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        // Pair entries with exits
        const maxPairs = Math.max(entries.length, exits.length);
        
        for (let i = 0; i < maxPairs; i++) {
          const entry = entries[i];
          const exit = exits[i];
          
          let horasTrabalhadas = '';
          if (entry && exit) {
            const diffMs = exit.timestamp.getTime() - entry.timestamp.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            horasTrabalhadas = `${diffHours.toFixed(2)}h`;
          }

          reportData.push({
            funcionario: userName,
            data: new Date(date).toLocaleDateString('pt-BR'),
            horaEntrada: entry ? entry.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
            localEntrada: entry?.location || '',
            horaSaida: exit ? exit.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
            localSaida: exit?.location || '',
            horasTrabalhadas,
          });
        }
      });
    });

    return reportData.sort((a, b) => a.funcionario.localeCompare(b.funcionario) || a.data.localeCompare(b.data));
  }

  private generateCSV(data: ReportData[]): string {
    const headers = [
      'Funcionário',
      'Data',
      'Hora de Entrada',
      'Local de Entrada',
      'Hora de Saída',
      'Local de Saída',
      'Horas Trabalhadas'
    ];

    const csvRows = [];
    csvRows.push(headers.join(','));

    data.forEach(row => {
      const values = [
        this.escapeCSV(row.funcionario),
        this.escapeCSV(row.data),
        this.escapeCSV(row.horaEntrada),
        this.escapeCSV(row.localEntrada),
        this.escapeCSV(row.horaSaida),
        this.escapeCSV(row.localSaida),
        this.escapeCSV(row.horasTrabalhadas),
      ];
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

export const reportsService = new ReportsService();
