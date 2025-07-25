import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertTimeRecordSchema, insertUserSchema, loginSchema } from "@shared/schema";
import { reverseGeocode } from "./services/geolocation";
import { reportsService } from "./services/reports";
import { emailService } from "./services/email";
import { z } from "zod";

// Authentication middleware
export const isAuthenticated = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Não autorizado" });
  }
  next();
};

export function registerRoutes(app: Express): Server {
  // Auth setup
  setupAuth(app);

  // Auth routes
  app.get('/api/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Erro ao buscar usuário" });
    }
  });

  // Change credentials route
  app.post('/api/change-credentials', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "A senha deve ter pelo menos 6 caracteres" });
      }

      // Check if email is already in use by another user
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && existingUser.id !== user.id) {
        return res.status(400).json({ message: "Este email já está em uso" });
      }

      // Hash the new password
      const { hashPassword } = await import('./auth');
      const hashedPassword = await hashPassword(password);

      // Update user credentials
      const updatedUser = await storage.updateUser(user.id, {
        email,
        password: hashedPassword,
        isDefaultCredentials: false, // Mark as no longer using default credentials
      });

      res.json({ ...updatedUser, password: undefined });
    } catch (error) {
      console.error("Error changing credentials:", error);
      res.status(500).json({ message: "Erro ao alterar credenciais" });
    }
  });

  // Time tracking routes
  app.post('/api/time-records', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const data = insertTimeRecordSchema.parse({
        ...req.body,
        userId,
      });

      // Get location name if coordinates provided
      if (data.latitude && data.longitude) {
        try {
          data.location = await reverseGeocode(Number(data.latitude), Number(data.longitude));
        } catch (error) {
          console.error('Reverse geocoding failed:', error);
        }
      }

      const record = await storage.createTimeRecord(data);
      res.json(record);
    } catch (error) {
      console.error("Error creating time record:", error);
      res.status(400).json({ message: "Erro ao registrar ponto" });
    }
  });

  app.get('/api/time-records/today', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const records = await storage.getTodayTimeRecords(userId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching today's records:", error);
      res.status(500).json({ message: "Erro ao buscar registros de hoje" });
    }
  });

  app.get('/api/time-records/monthly', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { month, year } = req.query;

      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (month && year) {
        startDate = new Date(Number(year), Number(month) - 1, 1);
        endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
      }

      const records = await storage.getUserTimeRecords(userId, startDate, endDate);
      res.json(records);
    } catch (error) {
      console.error("Error fetching monthly records:", error);
      res.status(500).json({ message: "Erro ao buscar registros mensais" });
    }
  });

  // Admin routes
  app.get('/api/admin/stats', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const stats = {
        activeEmployees: await storage.getActiveEmployeesCount(),
        todayEntries: await storage.getTodayEntriesCount(),
        todayExits: await storage.getTodayExitsCount(),
        currentlyWorking: await storage.getCurrentlyWorkingCount(),
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas" });
    }
  });

  app.get('/api/admin/recent-records', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const records = await storage.getRecentTimeRecords(limit);
      res.json(records);
    } catch (error) {
      console.error("Error fetching recent records:", error);
      res.status(500).json({ message: "Erro ao buscar registros recentes" });
    }
  });

  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  app.post('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const userData = insertUserSchema.parse(req.body);
      // Hash the password before creating the user
      const { hashPassword } = await import('./auth');
      const hashedPassword = await hashPassword(userData.password);

      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      res.json({ ...newUser, password: undefined });
    } catch (error: any) {
      console.error("Error creating user:", error);
      
      // Check for duplicate email error
      if (error?.code === '23505' && error?.constraint === 'users_email_key') {
        return res.status(400).json({ message: "Este email já está em uso. Por favor, use um email diferente." });
      }
      
      // Check for other validation errors
      if (error?.message?.includes('validation')) {
        return res.status(400).json({ message: "Dados inválidos. Verifique os campos obrigatórios." });
      }
      
      res.status(400).json({ message: "Erro ao criar usuário. Tente novamente." });
    }
  });

  app.put('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { id } = req.params;
      const updates = req.body;

      // Hash password if provided and not empty
      if (updates.password && updates.password.trim() !== '') {
        if (updates.password.length < 6) {
          return res.status(400).json({ message: "A senha deve ter pelo menos 6 caracteres" });
        }
        const { hashPassword } = await import('./auth');
        updates.password = await hashPassword(updates.password);
      } else {
        // Remove password field if empty to avoid updating with empty value
        delete updates.password;
      }

      const updatedUser = await storage.updateUser(parseInt(id), updates);
      res.json({ ...updatedUser, password: undefined });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ message: "Erro ao atualizar usuário" });
    }
  });

  app.delete('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { id } = req.params;
      await storage.deleteUserPermanently(parseInt(id));
      res.json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      console.error("Error deactivating user:", error);
      res.status(400).json({ message: "Erro ao desativar usuário" });
    }
  });

  // Permanent user deletion route
  app.delete('/api/admin/users/:id/permanent', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { id } = req.params;
      await storage.deleteUserPermanently(parseInt(id));
      res.json({ message: "Usuário excluído permanentemente" });
    } catch (error) {
      console.error("Error permanently deleting user:", error);
      res.status(400).json({ message: "Erro ao excluir usuário permanentemente" });
    }
  });

  // Clean test users route
  app.post('/api/admin/clean-test-users', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Find and delete test users
      const testEmails = [
        'funcionario1@cleanmyhouse.com',
        'funcionario2@cleanmyhouse.com'
      ];

      let deletedCount = 0;
      for (const email of testEmails) {
        const testUser = await storage.getUserByEmail(email);
        if (testUser) {
          await storage.deleteUserPermanently(testUser.id);
          deletedCount++;
          console.log(`Usuário de teste excluído: ${email}`);
        }
      }

      res.json({ 
        message: `${deletedCount} usuário(s) de teste excluído(s) permanentemente`,
        deletedCount 
      });
    } catch (error) {
      console.error("Error cleaning test users:", error);
      res.status(500).json({ message: "Erro ao excluir usuários de teste" });
    }
  });

  // Employee report request route
  app.post('/api/employee/request-report', isAuthenticated, async (req: any, res) => {
    console.log('Funcionário solicitando relatório...');
    
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Não autorizado" });
      }

      const { month, year } = req.body;
      console.log(`Parâmetros recebidos: mês=${month}, ano=${year}, usuário=${user.id}`);

      if (!month || !year) {
        return res.status(400).json({ message: "Mês e ano são obrigatórios" });
      }

      // Buscar email de destino configurado pelo admin
      const reportEmailSetting = await storage.getSetting('report_email');
      const reportEmail = reportEmailSetting?.value;

      if (!reportEmail) {
        console.error('Email de destino não configurado pelo administrador');
        return res.status(500).json({ message: "Email de destino não configurado. Entre em contato com o administrador." });
      }

      console.log('Gerando relatório individual...');
      const reportBuffer = await reportsService.generateMonthlyReport(Number(month), Number(year), user.id.toString(), 'pdf');
      console.log(`Relatório gerado com sucesso. Tamanho: ${reportBuffer.length} bytes`);

      console.log('Enviando relatório por email...');
      const monthName = new Date(Number(year), Number(month) - 1).toLocaleDateString('pt-BR', { 
        month: 'long', 
        year: 'numeric' 
      });

      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
      const emailSent = await emailService.sendReportEmail(reportEmail, reportBuffer, `${monthName} - ${userName}`, 'pdf');

      if (emailSent) {
        console.log('Email enviado com sucesso');
        res.json({ message: "Relatório enviado por email com sucesso" });
      } else {
        console.error('Falha ao enviar email');
        res.status(500).json({ message: "Erro ao enviar email. Verifique as configurações." });
      }
      
    } catch (error: unknown) {
      const errorObj = error as Error;
      console.error('Erro ao gerar relatório individual:', errorObj.message);
      res.status(500).json({ message: "Erro ao gerar relatório. Tente novamente." });
    }
  });

  // Reports routes
  app.post('/api/admin/reports/monthly', isAuthenticated, async (req: any, res) => {
    console.log('Iniciando geração de relatório...');
    
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { month, year, userId, sendEmail, format = 'pdf' } = req.body;
      console.log(`Parâmetros recebidos: mês=${month}, ano=${year}, formato=${format}, usuário=${userId}`);

      if (!month || !year) {
        return res.status(400).json({ message: "Mês e ano são obrigatórios" });
      }

      console.log('Gerando relatório...');
      const reportBuffer = await reportsService.generateMonthlyReport(Number(month), Number(year), userId, 'pdf');
      console.log(`Relatório gerado com sucesso. Tamanho: ${reportBuffer.length} bytes`);

      if (sendEmail) {
        console.log('Enviando relatório por email...');
        const reportEmailSetting = await storage.getSetting('report_email');
        const reportEmail = reportEmailSetting?.value;

        if (reportEmail) {
          const monthName = new Date(Number(year), Number(month) - 1).toLocaleDateString('pt-BR', { 
            month: 'long', 
            year: 'numeric' 
          });

          const emailSent = await emailService.sendReportEmail(reportEmail, reportBuffer, monthName, format);

          if (emailSent) {
            console.log('Email enviado com sucesso');
            res.json({ message: "Relatório enviado por email com sucesso" });
          } else {
            console.error('Falha ao enviar email');
            res.status(500).json({ message: "Erro ao enviar email" });
          }
        } else {
          console.error('Email de destino não configurado');
          res.status(400).json({ message: "Email de destino não configurado" });
        }
      } else {
        console.log('Retornando arquivo para download...');
        // Return PDF file for download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="relatorio-${month}-${year}.pdf"`);
        res.send(reportBuffer);
        console.log('Arquivo enviado para download');
      }
    } catch (error: unknown) {
      const errorObj = error as Error;
      console.error('Erro ao gerar relatório:', errorObj.message);
      
      const { sendEmail } = req.body;
      let errorMessage = 'Erro interno do servidor ao gerar relatório';
      
      if (errorObj.message?.includes('PDF')) {
        errorMessage = 'Erro ao gerar PDF. Verifique as dependências do sistema.';
      } else if (errorObj.message?.includes('timeout')) {
        errorMessage = 'Timeout ao gerar relatório. Tente novamente.';
      } else if (errorObj.message?.includes('launch')) {
        errorMessage = 'Erro ao inicializar o gerador de PDF. Verifique as dependências.';
      }
      
      if (sendEmail) {
        res.status(500).json({ message: 'Erro ao enviar email. Verifique as configurações de email no servidor.' });
      } else {
        res.status(500).json({ message: errorMessage });
      }
    }
  });

  // Settings routes
  app.get('/api/admin/settings/:key', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { key } = req.params;
      const setting = await storage.getSetting(key);
      res.json(setting);
    } catch (error) {
      console.error("Error fetching setting:", error);
      res.status(500).json({ message: "Erro ao buscar configuração" });
    }
  });

  app.post('/api/admin/settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { key, value } = req.body;
      const setting = await storage.setSetting(key, value);
      res.json(setting);
    } catch (error) {
      console.error("Error saving setting:", error);
      res.status(400).json({ message: "Erro ao salvar configuração" });
    }
  });

  // Delete time records by month and users (admin only)
  app.delete('/api/admin/time-records/month', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { month, year, userIds } = req.body;

      if (!month || !year) {
        return res.status(400).json({ message: "Mês e ano são obrigatórios" });
      }

      console.log(`Deletando registros para: mês=${month}, ano=${year}, usuários=${userIds || 'todos'}`);
      
      const deletedCount = await storage.deleteTimeRecordsByMonth(
        Number(month), 
        Number(year), 
        userIds && userIds.length > 0 ? userIds : undefined
      );
      
      console.log(`Registros deletados: ${deletedCount}`);
      
      res.json({ 
        message: `${deletedCount} registro(s) foram apagados com sucesso`,
        deletedCount 
      });
    } catch (error) {
      console.error('Erro ao deletar registros:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}