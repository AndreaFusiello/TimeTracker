import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertWorkHoursSchema, insertJobOrderSchema, registerSchema, loginSchema } from "@shared/schema";
import { z } from "zod";

// Simple auth middleware for local users
function requireAuth(req: any, res: any, next: any) {
  // Check for Replit auth first
  if (req.isAuthenticated && req.isAuthenticated() && req.user?.claims?.sub) {
    return next();
  }
  
  // Check for local auth session
  if (req.session?.localUser) {
    req.user = { localUser: req.session.localUser };
    return next();
  }
  
  return res.status(401).json({ message: "Unauthorized" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Local auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = registerSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username già esistente" });
      }
      
      const user = await storage.createLocalUser(userData);
      req.session!.localUser = user;
      res.json(user);
    } catch (error) {
      console.error("Error registering user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dati non validi", errors: error.errors });
      }
      if (error.code === '23505') {
        if (error.constraint === 'users_email_unique') {
          return res.status(400).json({ message: "Email già utilizzata" });
        }
        if (error.constraint === 'users_username_unique') {
          return res.status(400).json({ message: "Username già esistente" });
        }
      }
      res.status(500).json({ message: "Errore nella registrazione" });
    }
  });

  app.post('/api/auth/login-local', async (req, res) => {
    try {
      const loginData = loginSchema.parse(req.body);
      const user = await storage.authenticateUser(loginData.username, loginData.password);
      
      if (!user) {
        return res.status(401).json({ message: "Credenziali non valide" });
      }
      
      req.session!.localUser = user;
      res.json(user);
    } catch (error) {
      console.error("Error logging in user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dati non validi", errors: error.errors });
      }
      res.status(500).json({ message: "Errore nel login" });
    }
  });

  app.post('/api/auth/logout-local', async (req, res) => {
    req.session!.localUser = null;
    res.json({ message: "Logout effettuato" });
  });

  // Auth routes (updated to handle both auth types)
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      let user;
      if (req.user.claims?.sub) {
        // Replit user
        user = await storage.getUser(req.user.claims.sub);
      } else if (req.user.localUser) {
        // Local user
        user = req.user.localUser;
      }
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Work hours routes
  app.post("/api/work-hours", requireAuth, async (req: any, res) => {
    try {
      let userId, user;
      if (req.user.claims?.sub) {
        userId = req.user.claims.sub;
        user = await storage.getUser(userId);
      } else if (req.user.localUser) {
        user = req.user.localUser;
        userId = user.id;
      }
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const workHoursData = insertWorkHoursSchema.parse({
        ...req.body,
        workDate: new Date(req.body.workDate),
        userId,
        operatorName: `${user.firstName} ${user.lastName}`.trim() || user.email || user.username,
      });

      const workHours = await storage.createWorkHours(workHoursData);
      res.json(workHours);
    } catch (error) {
      console.error("Error creating work hours:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create work hours entry" });
    }
  });

  app.get("/api/work-hours", requireAuth, async (req: any, res) => {
    try {
      let userId, user;
      if (req.user.claims?.sub) {
        userId = req.user.claims.sub;
        user = await storage.getUser(userId);
      } else if (req.user.localUser) {
        user = req.user.localUser;
        userId = user.id;
      }
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { startDate, endDate, activityType, jobNumber, operatorId } = req.query;
      
      let workHours;
      if (user.role === 'admin') {
        // Admins can see all work hours
        workHours = await storage.getAllWorkHours({
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          userId: operatorId as string,
          activityType: activityType as string,
          jobNumber: jobNumber as string,
        });
      } else if (user.role === 'team_leader') {
        // Team leaders can see their team's work hours
        workHours = await storage.getAllWorkHours({
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          activityType: activityType as string,
          jobNumber: jobNumber as string,
        });
      } else {
        // Operators can only see their own work hours
        workHours = await storage.getWorkHoursByUser(
          userId,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        );
      }

      res.json(workHours);
    } catch (error) {
      console.error("Error fetching work hours:", error);
      res.status(500).json({ message: "Failed to fetch work hours" });
    }
  });

  app.get("/api/work-hours/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const workHours = await storage.getWorkHoursById(req.params.id);
      
      if (!workHours) {
        return res.status(404).json({ message: "Work hours entry not found" });
      }

      // Check permissions
      if (user?.role !== 'admin' && workHours.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(workHours);
    } catch (error) {
      console.error("Error fetching work hours:", error);
      res.status(500).json({ message: "Failed to fetch work hours entry" });
    }
  });

  app.put("/api/work-hours/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const workHours = await storage.getWorkHoursById(req.params.id);
      
      if (!workHours) {
        return res.status(404).json({ message: "Work hours entry not found" });
      }

      // Check permissions
      if (user?.role !== 'admin' && user?.role !== 'team_leader' && workHours.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updates = insertWorkHoursSchema.partial().parse(req.body);
      const updatedWorkHours = await storage.updateWorkHours(req.params.id, updates);
      res.json(updatedWorkHours);
    } catch (error) {
      console.error("Error updating work hours:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update work hours entry" });
    }
  });

  app.delete("/api/work-hours/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const workHours = await storage.getWorkHoursById(req.params.id);
      
      if (!workHours) {
        return res.status(404).json({ message: "Work hours entry not found" });
      }

      // Check permissions
      if (user?.role !== 'admin' && workHours.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteWorkHours(req.params.id);
      res.json({ message: "Work hours entry deleted successfully" });
    } catch (error) {
      console.error("Error deleting work hours:", error);
      res.status(500).json({ message: "Failed to delete work hours entry" });
    }
  });

  // Statistics routes
  app.get("/api/stats/user", requireAuth, async (req: any, res) => {
    try {
      let userId;
      if (req.user.claims?.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.localUser) {
        userId = req.user.localUser.id;
      }
      const stats = await storage.getUserHoursStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user statistics" });
    }
  });

  app.get("/api/stats/team", requireAuth, async (req: any, res) => {
    try {
      let userId, user;
      if (req.user.claims?.sub) {
        userId = req.user.claims.sub;
        user = await storage.getUser(userId);
      } else if (req.user.localUser) {
        user = req.user.localUser;
        userId = user.id;
      }
      
      if (!user || (user.role !== 'team_leader' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const stats = await storage.getTeamHoursStats(user.teamId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching team stats:", error);
      res.status(500).json({ message: "Failed to fetch team statistics" });
    }
  });

  // Job orders routes
  app.get("/api/job-orders", isAuthenticated, async (req, res) => {
    try {
      const jobOrders = await storage.getJobOrders();
      res.json(jobOrders);
    } catch (error) {
      console.error("Error fetching job orders:", error);
      res.status(500).json({ message: "Failed to fetch job orders" });
    }
  });

  app.post("/api/job-orders", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const jobOrderData = insertJobOrderSchema.parse(req.body);
      const jobOrder = await storage.createJobOrder(jobOrderData);
      res.json(jobOrder);
    } catch (error) {
      console.error("Error creating job order:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create job order" });
    }
  });

  // User management routes (admin only)
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { role } = req.query;
      const users = role 
        ? await storage.getUsersByRole(role as string)
        : await storage.getUsersByRole('operator').then(operators =>
            storage.getUsersByRole('team_leader').then(teamLeaders =>
              storage.getUsersByRole('admin').then(admins =>
                [...operators, ...teamLeaders, ...admins]
              )
            )
          );
      
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put("/api/users/:id/role", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { role } = req.body;
      if (!['operator', 'team_leader', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updatedUser = await storage.updateUserRole(req.params.id, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Export routes
  app.get("/api/export/csv", requireAuth, async (req: any, res) => {
    try {
      let userId, user;
      if (req.user.claims?.sub) {
        userId = req.user.claims.sub;
        user = await storage.getUser(userId);
      } else if (req.user.localUser) {
        user = req.user.localUser;
        userId = user.id;
      }
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { startDate, endDate, activityType, jobNumber } = req.query;
      
      let workHours;
      if (user.role === 'admin') {
        workHours = await storage.getAllWorkHours({
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          activityType: activityType as string,
          jobNumber: jobNumber as string,
        });
      } else {
        workHours = await storage.getWorkHoursByUser(
          userId,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        );
      }

      // Generate CSV
      const csvHeaders = [
        'Data',
        'Operatore', 
        'Numero Commessa',
        'Nome Commessa',
        'Tipo Attività',
        'Ditta Riparazione',
        'Ore Lavorate',
        'Note'
      ];

      const csvRows = workHours.map(entry => [
        new Date(entry.workDate).toLocaleDateString('it-IT'),
        entry.operatorName,
        entry.jobNumber,
        entry.jobName,
        entry.activityType,
        entry.repairCompany || '',
        entry.hoursWorked,
        entry.notes || ''
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="ore-lavorative-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      res.status(500).json({ message: "Failed to export CSV" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
