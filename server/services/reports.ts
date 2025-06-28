import { storage } from '../storage';
import type { TimeRecord, User } from '@shared/schema';
import { db } from '../db';
import { users, timeRecords } from '@shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { workingPdfGenerator } from './working-pdf-generator';

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
      if (!user) {
        throw new Error(`Usuário com ID ${userId} não encontrado`);
      }
      records = userRecords.map(record => ({ ...record, user }));
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
      console.log('Gerando PDF real...');
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const pdfBuffer = await workingPdfGenerator.generateMonthlyReportPDF(
        groupedRecords, 
        monthNames[month - 1], 
        year
      );
      console.log('PDF real gerado com sucesso');
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
            
            if (diffHours > 0) {
              horasTrabalhadas = `${diffHours.toFixed(2)}h`;
            }
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

  private generateTextReport(data: ReportData[], month: string, year: number): string {
    let content = '';
    content += '='.repeat(60) + '\n';
    content += '           CLEAN MY HOUSE - RELATÓRIO MENSAL\n';
    content += '='.repeat(60) + '\n';
    content += `Período: ${month} de ${year}\n`;
    content += `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}\n`;
    content += '='.repeat(60) + '\n\n';
    
    if (!data || data.length === 0) {
      content += 'Nenhum registro encontrado para o período selecionado.\n\n';
    } else {
      // Agrupar dados por funcionário
      const groupedData = this.groupByEmployee(data);
      
      Object.entries(groupedData).forEach(([employee, records]) => {
        content += `FUNCIONÁRIO: ${employee}\n`;
        content += '-'.repeat(40) + '\n';
        
        records.forEach(record => {
          content += `Data: ${record.data}\n`;
          content += `Entrada: ${record.horaEntrada} - ${this.truncateLocation(record.localEntrada || 'N/A')}\n`;
          content += `Saída: ${record.horaSaida} - ${this.truncateLocation(record.localSaida || 'N/A')}\n`;
          content += `Horas trabalhadas: ${record.horasTrabalhadas}\n`;
          content += `Status: ${record.status}\n`;
          content += '\n';
        });
        
        const totalHours = this.calculateTotalHours(records);
        content += `TOTAL DE HORAS NO MÊS: ${totalHours}h\n`;
        content += '='.repeat(40) + '\n\n';
      });
    }
    
    content += 'Relatório gerado pelo sistema Clean My House\n';
    content += '='.repeat(60) + '\n';
    
    return content;
  }

  private groupByEmployee(data: ReportData[]): Record<string, ReportData[]> {
    return data.reduce((acc, record) => {
      if (!acc[record.funcionario]) {
        acc[record.funcionario] = [];
      }
      acc[record.funcionario].push(record);
      return acc;
    }, {} as Record<string, ReportData[]>);
  }

  private calculateTotalHours(records: ReportData[]): string {
    let totalMinutes = 0;
    
    records.forEach(record => {
      if (record.horasTrabalhadas && record.horasTrabalhadas !== '0') {
        const parts = record.horasTrabalhadas.split(':');
        if (parts.length === 2) {
          const hours = parseInt(parts[0]) || 0;
          const minutes = parseInt(parts[1]) || 0;
          totalMinutes += hours * 60 + minutes;
        }
      }
    });
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }

  private truncateLocation(location: string): string {
    if (!location || location === 'N/A') return 'N/A';
    return location.length > 50 ? location.substring(0, 47) + '...' : location;
  }

  private escapeCSV(value: string): string {
    // Always quote values to prevent Excel formatting issues
    return `"${value.replace(/"/g, '""')}"`;
  }
}

export const reportsService = new ReportsService();
