
import puppeteer from 'puppeteer';
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

export class PDFGenerator {
  async generateMonthlyReportPDF(
    data: ReportData[],
    month: string,
    year: number
  ): Promise<Buffer> {
    const html = this.generateHTML(data, month, year);
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'
      ]
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });
    
    await browser.close();
    return Buffer.from(pdf);
  }

  private generateHTML(data: ReportData[], month: string, year: number): string {
    const currentDate = new Date().toLocaleDateString('pt-BR');
    
    // Agrupar dados por funcionário
    const groupedData = this.groupByEmployee(data);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Relatório Mensal - ${month} ${year}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            position: relative;
        }
        
        /* Marca d'água */
        body::before {
            content: '';
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 80px;
            font-weight: bold;
            color: rgba(236, 72, 153, 0.1);
            z-index: -1;
            white-space: nowrap;
            pointer-events: none;
        }
        
        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 60px;
            font-weight: bold;
            color: rgba(236, 72, 153, 0.08);
            z-index: -1;
            white-space: nowrap;
            pointer-events: none;
        }
        
        .header {
            background: linear-gradient(135deg, #EC4899, #D946EF);
            color: white;
            padding: 30px 40px;
            text-align: center;
            margin-bottom: 30px;
            border-radius: 10px;
        }
        
        .logo {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        
        .logo::before {
            content: '🏠';
            font-size: 36px;
        }
        
        .subtitle {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 20px;
        }
        
        .report-info {
            background: rgba(255, 255, 255, 0.2);
            padding: 15px;
            border-radius: 8px;
            display: inline-block;
        }
        
        .content {
            padding: 0 20px;
        }
        
        .period-title {
            font-size: 24px;
            font-weight: bold;
            color: #EC4899;
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 10px;
            border-bottom: 3px solid #EC4899;
        }
        
        .employee-section {
            margin-bottom: 40px;
            background: #f8f9fa;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .employee-header {
            background: linear-gradient(135deg, #EC4899, #D946EF);
            color: white;
            padding: 15px 20px;
            font-size: 18px;
            font-weight: bold;
        }
        
        .summary-stats {
            background: white;
            padding: 15px 20px;
            display: flex;
            justify-content: space-around;
            border-bottom: 1px solid #e9ecef;
        }
        
        .stat-item {
            text-align: center;
        }
        
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #EC4899;
        }
        
        .stat-label {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }
        
        .records-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
        }
        
        .records-table th {
            background: #f8f9fa;
            padding: 12px 8px;
            text-align: left;
            font-weight: bold;
            border-bottom: 2px solid #dee2e6;
            font-size: 11px;
        }
        
        .records-table td {
            padding: 10px 8px;
            border-bottom: 1px solid #dee2e6;
            font-size: 11px;
        }
        
        .records-table tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        .status-complete {
            background: #d4edda;
            color: #155724;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 10px;
        }
        
        .status-incomplete {
            background: #f8d7da;
            color: #721c24;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 10px;
        }
        
        .footer {
            margin-top: 40px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            text-align: center;
            color: #666;
            border-top: 3px solid #EC4899;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="watermark">CLEAN MY HOUSE</div>
    
    <div class="header">
        <div class="logo">Clean My House</div>
        <div class="subtitle">Sistema de Registro de Ponto</div>
        <div class="report-info">
            <div>Relatório Mensal de Ponto</div>
            <div>${month} ${year}</div>
        </div>
    </div>
    
    <div class="content">
        <div class="period-title">Relatório de ${month} ${year}</div>
        
        ${Object.entries(groupedData).map(([employee, records], index) => `
            ${index > 0 ? '<div class="page-break"></div>' : ''}
            <div class="employee-section">
                <div class="employee-header">
                    👤 ${employee}
                </div>
                
                <div class="summary-stats">
                    <div class="stat-item">
                        <div class="stat-number">${records.length}</div>
                        <div class="stat-label">Registros</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${records.filter(r => r.status === 'Completo').length}</div>
                        <div class="stat-label">Dias Completos</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${this.calculateTotalHours(records)}</div>
                        <div class="stat-label">Total de Horas</div>
                    </div>
                </div>
                
                <table class="records-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Entrada</th>
                            <th>Local Entrada</th>
                            <th>Saída</th>
                            <th>Local Saída</th>
                            <th>Horas</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records.map(record => `
                            <tr>
                                <td>${record.data}</td>
                                <td>${record.horaEntrada || '-'}</td>
                                <td>${this.truncateLocation(record.localEntrada)}</td>
                                <td>${record.horaSaida || '-'}</td>
                                <td>${this.truncateLocation(record.localSaida)}</td>
                                <td>${record.horasTrabalhadas || '-'}</td>
                                <td>
                                    <span class="${record.status === 'Completo' ? 'status-complete' : 'status-incomplete'}">
                                        ${record.status}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `).join('')}
    </div>
    
    <div class="footer">
        <div><strong>Clean My House</strong> - Sistema de Registro de Ponto</div>
        <div>Relatório gerado em ${currentDate}</div>
        <div style="margin-top: 10px; font-size: 10px;">
            Este documento foi gerado automaticamente pelo sistema Clean My House
        </div>
    </div>
</body>
</html>`;
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
    const totalHours = records.reduce((total, record) => {
      if (record.horasTrabalhadas) {
        const hours = parseFloat(record.horasTrabalhadas.replace('h', ''));
        return total + (isNaN(hours) ? 0 : hours);
      }
      return total;
    }, 0);
    
    return `${totalHours.toFixed(1)}h`;
  }

  private truncateLocation(location: string): string {
    if (!location || location === '-') return '-';
    return location.length > 30 ? location.substring(0, 30) + '...' : location;
  }
}

export const pdfGenerator = new PDFGenerator();
