import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertTimeRecordSchema, insertUserSchema } from "@shared/schema";
import { reverseGeocode } from "./services/geolocation";
import { reportsService } from "./services/reports";
import { emailService } from "./services/email";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Time tracking routes
  app.post('/api/time-records', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const records = await storage.getTodayTimeRecords(userId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching today's records:", error);
      res.status(500).json({ message: "Erro ao buscar registros de hoje" });
    }
  });

  app.get('/api/time-records/monthly', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const user = await storage.getUser(req.user.claims.sub);
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
      const user = await storage.getUser(req.user.claims.sub);
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
      const user = await storage.getUser(req.user.claims.sub);
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
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const userData = insertUserSchema.parse(req.body);
      const newUser = await storage.upsertUser({
        id: `user_${Date.now()}`, // Generate a simple ID
        ...userData,
      });

      res.json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: "Erro ao criar usuário" });
    }
  });

  app.put('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { id } = req.params;
      const updates = req.body;
      
      const updatedUser = await storage.updateUser(id, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ message: "Erro ao atualizar usuário" });
    }
  });

  app.delete('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { id } = req.params;
      await storage.deactivateUser(id);
      res.json({ message: "Usuário desativado com sucesso" });
    } catch (error) {
      console.error("Error deactivating user:", error);
      res.status(400).json({ message: "Erro ao desativar usuário" });
    }
  });

  // Reports routes
  app.post('/api/admin/reports/monthly', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { month, year, userId, sendEmail } = req.body;
      
      if (!month || !year) {
        return res.status(400).json({ message: "Mês e ano são obrigatórios" });
      }

      const csvBuffer = await reportsService.generateMonthlyReport(Number(month), Number(year), userId);
      
      if (sendEmail) {
        const reportEmailSetting = await storage.getSetting('report_email');
        const reportEmail = reportEmailSetting?.value;
        
        if (reportEmail) {
          const monthName = new Date(Number(year), Number(month) - 1).toLocaleDateString('pt-BR', { 
            month: 'long', 
            year: 'numeric' 
          });
          
          const emailSent = await emailService.sendReportEmail(reportEmail, csvBuffer, monthName);
          
          if (emailSent) {
            res.json({ message: "Relatório enviado por email com sucesso" });
          } else {
            res.status(500).json({ message: "Erro ao enviar email" });
          }
        } else {
          res.status(400).json({ message: "Email de destino não configurado" });
        }
      } else {
        // Return CSV for download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="relatorio-${month}-${year}.csv"`);
        res.send(csvBuffer);
      }
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: "Erro ao gerar relatório" });
    }
  });

  // Settings routes
  app.get('/api/admin/settings/:key', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
      const user = await storage.getUser(req.user.claims.sub);
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

  const httpServer = createServer(app);
  return httpServer;
}
