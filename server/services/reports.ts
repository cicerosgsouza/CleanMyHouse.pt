import { storage } from '../storage';
import { pdfGenerator } from './pdf-generator-new';
import type { TimeRecord, User } from '@shared/schema';

interface ReportData {
  funcionario: string;
  data: string;
  horaEntrada: string;
  localEntrada: string;
  horaSaida: string;
  localSaida: string;
  horasTrabalhadas: string;
  status: string;
}

export class ReportsService {
  async generateMonthlyReport(month: number, year: number, userId?: string, format: 'pdf' | 'csv' = 'pdf'): Promise<Buffer> {
    console.log(`Gerando relatório para: mês=${month}, ano=${year}, usuário=${userId || 'todos'}, formato=${format}`);
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    console.log(`Período: ${startDate.toISOString()} até ${endDate.toISOString()}`);

    let records: (TimeRecord & { user: User })[];
    
    if (userId) {
      console.log(`Buscando registros do usuário ${userId}...`);
      const userRecords = await storage.getUserTimeRecords(userId, startDate, endDate);
      const user = await storage.getUser(userId);
      records = userRecords.map(record => ({ ...record, user: user! }));
      console.log(`Encontrados ${userRecords.length} registros para o usuário`);
    } else {
      console.log('Buscando todos os registros...');
      records = await storage.getAllTimeRecords(startDate, endDate);
      console.log(`Encontrados ${records.length} registros totais`);
    }

    // Group records by user and date
    console.log('Agrupando registros por usuário e data...');
    const groupedRecords = this.groupRecordsByUserAndDate(records);
    console.log(`Dados agrupados: ${groupedRecords.length} linhas`);
    
    if (format === 'pdf') {
      console.log('Iniciando geração de PDF...');
      const monthName = new Date(year, month - 1).toLocaleDateString('pt-BR', { 
        month: 'long', 
        year: 'numeric' 
      });
      const pdfBuffer = await pdfGenerator.generateMonthlyReportPDF(groupedRecords, monthName, year);
      console.log('PDF gerado com sucesso');
      return pdfBuffer;
    } else {
      console.log('Gerando CSV...');
      const csvContent = this.generateCSV(groupedRecords);
      console.log('CSV gerado com sucesso');
      return Buffer.from(csvContent, 'utf-8');
    }
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

          const status = entry && exit ? 'Completo' : 
                        entry ? 'Entrada sem saída' : 'Saída sem entrada';

          reportData.push({
            funcionario: userName,
            data: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            horaEntrada: entry ? entry.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
            localEntrada: entry?.location || '',
            horaSaida: exit ? exit.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
            localSaida: exit?.location || '',
            horasTrabalhadas,
            status,
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
      'Horário de Entrada',
      'Local de Entrada',
      'Horário de Saída',
      'Local de Saída',
      'Horas Trabalhadas',
      'Status'
    ];

    const csvRows = [];
    // Add BOM for proper Excel encoding
    csvRows.push('\uFEFF' + headers.join(';'));

    data.forEach(row => {
      const status = row.horaEntrada && row.horaSaida ? 'Completo' : 
                    row.horaEntrada ? 'Entrada sem saída' : 'Saída sem entrada';
      
      const values = [
        this.escapeCSV(row.funcionario),
        this.escapeCSV(row.data),
        this.escapeCSV(row.horaEntrada || '-'),
        this.escapeCSV(row.localEntrada || '-'),
        this.escapeCSV(row.horaSaida || '-'),
        this.escapeCSV(row.localSaida || '-'),
        this.escapeCSV(row.horasTrabalhadas || '-'),
        this.escapeCSV(status),
      ];
      csvRows.push(values.join(';'));
    });

    return csvRows.join('\r\n');
  }

  private escapeCSV(value: string): string {
    // Always quote values to prevent Excel formatting issues
    return `"${value.replace(/"/g, '""')}"`;
  }
}

export const reportsService = new ReportsService();
