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

export class SimplePDFGenerator {
  async generateMonthlyReportPDF(
    data: ReportData[],
    month: string,
    year: number
  ): Promise<Buffer> {
    console.log('Gerando relatório simplificado em texto...');
    
    // Como fallback, gerar um relatório em texto formatado
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
    
    return Buffer.from(content, 'utf-8');
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
}

export const simplePdfGenerator = new SimplePDFGenerator();