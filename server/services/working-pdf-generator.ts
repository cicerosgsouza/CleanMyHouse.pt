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

export class WorkingPDFGenerator {
  async generateMonthlyReportPDF(
    data: ReportData[],
    month: string,
    year: number
  ): Promise<Buffer> {
    console.log('Gerando PDF usando jsPDF...');
    
    try {
      // Import jsPDF dynamically for server-side usage
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Configurar fonte
      doc.setFont('helvetica');

      // Cabeçalho
      doc.setFontSize(18);
      doc.text('Clean My House', 105, 20, { align: 'center' });
      
      doc.setFontSize(14);
      doc.text('Relatório Mensal de Ponto', 105, 30, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`${month} de ${year}`, 105, 40, { align: 'center' });

      let yPosition = 60;

      if (!data || data.length === 0) {
        doc.setFontSize(12);
        doc.text('Nenhum registro encontrado para o período selecionado.', 105, yPosition, { align: 'center' });
      } else {
        // Agrupar dados por funcionário
        const groupedData = this.groupByEmployee(data);
        
        Object.entries(groupedData).forEach(([employee, records]) => {
          // Verificar se há espaço na página
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }

          // Nome do funcionário
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(`Funcionário: ${employee}`, 20, yPosition);
          yPosition += 10;
          
          // Linha separadora
          doc.setLineWidth(0.5);
          doc.line(20, yPosition, 190, yPosition);
          yPosition += 5;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);

          records.forEach(record => {
            // Verificar espaço na página
            if (yPosition > 270) {
              doc.addPage();
              yPosition = 20;
            }

            doc.text(`Data: ${record.data}`, 20, yPosition);
            yPosition += 5;
            
            doc.text(`Entrada: ${record.horaEntrada} - ${this.truncateLocation(record.localEntrada || 'N/A')}`, 20, yPosition);
            yPosition += 5;
            
            doc.text(`Saída: ${record.horaSaida} - ${this.truncateLocation(record.localSaida || 'N/A')}`, 20, yPosition);
            yPosition += 5;
            
            doc.text(`Horas trabalhadas: ${record.horasTrabalhadas}`, 20, yPosition);
            yPosition += 5;
            
            doc.text(`Status: ${record.status}`, 20, yPosition);
            yPosition += 8;
          });

          // Total de horas
          const totalHours = this.calculateTotalHours(records);
          doc.setFont('helvetica', 'bold');
          doc.text(`Total de horas no mês: ${totalHours}h`, 20, yPosition);
          yPosition += 15;
        });
      }

      // Rodapé
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
          105,
          290,
          { align: 'center' }
        );
        doc.text(`Página ${i} de ${pageCount}`, 190, 285, { align: 'right' });
      }

      // Converter para buffer
      const pdfArrayBuffer = doc.output('arraybuffer');
      const pdfBuffer = Buffer.from(pdfArrayBuffer);
      
      console.log('PDF gerado com sucesso usando jsPDF, tamanho:', pdfBuffer.length);
      return pdfBuffer;

    } catch (error) {
      console.error('Erro ao gerar PDF com jsPDF:', error);
      
      // Fallback: gerar PDF usando método manual básico
      return this.generateBasicPDF(data, month, year);
    }
  }

  private generateBasicPDF(data: ReportData[], month: string, year: number): Buffer {
    console.log('Usando gerador de PDF básico como fallback...');
    
    // Criar um PDF básico manualmente
    const pdfContent = this.createMinimalPDF(data, month, year);
    return Buffer.from(pdfContent);
  }

  private createMinimalPDF(data: ReportData[], month: string, year: number): Uint8Array {
    // Criar um PDF mínimo válido manualmente
    const content = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length ${this.calculateContentLength(data, month, year)}
>>
stream
BT
/F1 12 Tf
50 750 Td
(Clean My House - Relatório Mensal) Tj
0 -20 Td
(${month} de ${year}) Tj
0 -30 Td
${this.generatePDFContent(data)}
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000015 00000 n 
0000000068 00000 n 
0000000125 00000 n 
0000000270 00000 n 
0000000400 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
500
%%EOF`;

    return new TextEncoder().encode(content);
  }

  private calculateContentLength(data: ReportData[], month: string, year: number): number {
    // Calcular tamanho aproximado do conteúdo
    let length = 100; // Base
    if (data && data.length > 0) {
      length += data.length * 50;
    }
    return length;
  }

  private generatePDFContent(data: ReportData[]): string {
    if (!data || data.length === 0) {
      return '(Nenhum registro encontrado) Tj';
    }

    let content = '';
    const groupedData = this.groupByEmployee(data);
    let yOffset = 0;

    Object.entries(groupedData).forEach(([employee, records]) => {
      content += `0 -${20 + yOffset} Td\n`;
      content += `(Funcionario: ${employee}) Tj\n`;
      yOffset += 20;

      records.forEach(record => {
        content += `0 -15 Td\n`;
        content += `(${record.data} - ${record.horaEntrada} as ${record.horaSaida}) Tj\n`;
        yOffset += 15;
      });

      const totalHours = this.calculateTotalHours(records);
      content += `0 -15 Td\n`;
      content += `(Total: ${totalHours}h) Tj\n`;
      yOffset += 25;
    });

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
    let totalHours = 0;
    
    console.log('=== CALCULANDO TOTAL WORKING-PDF-GENERATOR ===');
    console.log('Registros recebidos:', records.length);
    
    records.forEach(record => {
      console.log(`Processando: ${record.funcionario} - Horas: "${record.horasTrabalhadas}"`);
      
      if (record.horasTrabalhadas && record.horasTrabalhadas !== '') {
        // Remove 'h' e converte para decimal
        const timeString = record.horasTrabalhadas.replace('h', '');
        const hoursDecimal = parseFloat(timeString);
        
        if (!isNaN(hoursDecimal) && hoursDecimal > 0) {
          totalHours += hoursDecimal;
          console.log(`✓ Adicionado: ${hoursDecimal}h. Total acumulado: ${totalHours}h`);
        } else {
          console.log(`✗ Ignorado (não é número válido): "${timeString}"`);
        }
      } else {
        console.log(`✗ Ignorado (vazio ou nulo)`);
      }
    });
    
    // Converte para formato horas:minutos
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    const result = `${hours}:${minutes.toString().padStart(2, '0')}h`;
    
    console.log(`=== RESULTADO FINAL: ${result} (${totalHours} horas decimais) ===`);
    
    return result;
  }

  private truncateLocation(location: string): string {
    if (!location || location === 'N/A') return 'N/A';
    return location.length > 40 ? location.substring(0, 37) + '...' : location;
  }
}

export const workingPdfGenerator = new WorkingPDFGenerator();