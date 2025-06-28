import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private async initTransporter() {
    try {
      // Use environment variables for email configuration
      const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
      const emailPort = parseInt(process.env.EMAIL_PORT || '587');
      const emailUser = process.env.EMAIL_USER;
      const emailPass = process.env.EMAIL_PASS;

      if (!emailUser || !emailPass) {
        console.warn('Email credentials not configured. Email functionality will be disabled.');
        return;
      }

      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection (but don't fail initialization if verification fails)
      try {
        await this.transporter.verify();
        console.log('Email service initialized and verified successfully');
      } catch (verifyError) {
        console.warn('Email service initialized but verification failed. Email may still work:', verifyError.message);
      }
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.transporter = null;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email service not initialized');
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        ...options,
      });

      console.log('Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async sendReportEmail(to: string, reportBuffer: Buffer, month: string, format: 'pdf' | 'csv' = 'pdf'): Promise<boolean> {
    if (!this.transporter) {
      console.error('Serviço de email não configurado. Configure EMAIL_USER e EMAIL_PASS nas variáveis de ambiente.');
      return false;
    }
    
    return this.sendEmail({
      to,
      subject: `Clean My House - Relatório Mensal de Ponto (${month})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #EC4899, #D946EF); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Clean My House</h1>
            <p style="color: white; margin: 10px 0 0 0;">Sistema de Registro de Ponto</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-top: 0;">Relatório Mensal de Ponto</h2>
            <p style="color: #666; line-height: 1.6;">
              Prezado(a),<br><br>
              Segue em anexo o relatório mensal de ponto dos funcionários referente ao período de <strong>${month}</strong>.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #EC4899; margin-top: 0;">Informações do Relatório:</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li>Período: ${month}</li>
                <li>Formato: ${format.toUpperCase()} ${format === 'pdf' ? '(Adobe PDF)' : '(Excel comp'}atível)</li>
                <li>Conteúdo: Registros de entrada e saída com localização</li>
                <li>Gerado em: ${new Date().toLocaleDateString('pt-BR')}</li>
              </ul>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              ${format === 'pdf' ? 
                'Para visualizar o arquivo, utilize qualquer leitor de PDF como Adobe Acrobat Reader, navegador web ou aplicativo de PDF.' :
                'Para abrir o arquivo, utilize Microsoft Excel, Google Sheets ou qualquer editor de planilhas compatível com CSV.'
              }
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px;">
              <p>Este é um email automático do sistema Clean My House. Não responda a este email.</p>
            </div>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `relatorio-ponto-${month.toLowerCase().replace(' ', '-')}.${format}`,
          content: reportBuffer,
          contentType: format === 'pdf' ? 'application/pdf' : 'text/csv',
        },
      ],
    });
  }
}

export const emailService = new EmailService();
