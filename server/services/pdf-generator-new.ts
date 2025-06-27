import type { TimeRecord, User } from '@shared/schema';
import PDFDocument from 'pdfkit';

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

export class PDFGenerator {
  async generateMonthlyReportPDF(
    data: ReportData[],
    month: string,
    year: number
  ): Promise<Buffer> {
    console.log('Iniciando geração de PDF com PDFKit...');
    
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50
        });
        
        const chunks: Buffer[] = [];
        
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => {
          console.log('PDF gerado com sucesso, tamanho:', Buffer.concat(chunks).length);
          resolve(Buffer.concat(chunks));
        });
        doc.on('error', (error: Error) => {
          console.error('Erro ao gerar PDF:', error);
          reject(error);
        });
        
        // Cabeçalho
        doc.fontSize(18)
           .font('Helvetica-Bold')
           .text('Clean My House', { align: 'center' });
        
        doc.fontSize(14)
           .font('Helvetica')
           .text('Relatório Mensal de Ponto', { align: 'center' });
        
        doc.fontSize(12)
           .text(`${month} de ${year}`, { align: 'center' });
        
        doc.moveDown(2);
        
        if (!data || data.length === 0) {
          doc.fontSize(12)
             .font('Helvetica')
             .text('Nenhum registro encontrado para o período selecionado.', { align: 'center' });
        } else {
          // Agrupar dados por funcionário
          const groupedData = this.groupByEmployee(data);
          
          Object.entries(groupedData).forEach(([employee, records]) => {
            // Nome do funcionário
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .text(`Funcionário: ${employee}`);
            
            doc.moveDown(0.5);
            
            // Registros do funcionário
            records.forEach(record => {
              doc.fontSize(10)
                 .font('Helvetica')
                 .text(`Data: ${record.data}`);
              
              doc.text(`Entrada: ${record.horaEntrada} - ${this.truncateLocation(record.localEntrada || 'N/A')}`);
              doc.text(`Saída: ${record.horaSaida} - ${this.truncateLocation(record.localSaida || 'N/A')}`);
              doc.text(`Horas trabalhadas: ${record.horasTrabalhadas}`);
              doc.text(`Status: ${record.status}`);
              
              doc.moveDown(0.5);
            });
            
            // Total de horas
            const totalHours = this.calculateTotalHours(records);
            doc.fontSize(11)
               .font('Helvetica-Bold')
               .text(`Total de horas no mês: ${totalHours}h`);
            
            doc.moveDown(1.5);
          });
        }
        
        // Rodapé
        doc.fontSize(8)
           .font('Helvetica')
           .text(`Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 
                 { align: 'center' });
        
        doc.end();
        
      } catch (error) {
        console.error('Erro ao criar PDF:', error);
        reject(new Error(`Erro na geração do PDF: ${error.message}`));
      }
    });
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

export const pdfGenerator = new PDFGenerator();