import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertWorkHoursSchema, updateWorkHoursSchema, insertJobOrderSchema, registerSchema, loginSchema, insertEquipmentSchema, updateEquipmentSchema } from "@shared/schema";
import { upload, deleteFile } from "./uploads";
import { z } from "zod";
import path from "path";
import fs from "fs";

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

  app.post('/api/auth/login-local', async (req, res) => {
    try {
      const loginData = loginSchema.parse(req.body);
      const user = await storage.authenticateUser(loginData.username, loginData.password);
      
      if (!user) {
        return res.status(401).json({ message: "Credenziali non valide" });
      }
      
      // Check if user is enabled
      if (!user.enabled) {
        return res.status(401).json({ message: "Account disabilitato. Contatta l'amministratore." });
      }
      
      (req.session as any).localUser = user;
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
    (req.session as any).localUser = null;
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
      
      // Check if user is enabled (for local users)
      if (req.user.localUser && !user.enabled) {
        return res.status(401).json({ message: "Account disabilitato. Contatta l'amministratore." });
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

  app.get("/api/work-hours/:id", requireAuth, async (req: any, res) => {
    try {
      let userId, user;
      if (req.user.claims?.sub) {
        userId = req.user.claims.sub;
        user = await storage.getUser(userId);
      } else if (req.user.localUser) {
        user = req.user.localUser;
        userId = user.id;
      }
      
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

  app.put("/api/work-hours/:id", requireAuth, async (req: any, res) => {
    try {
      let userId, user;
      if (req.user.claims?.sub) {
        userId = req.user.claims.sub;
        user = await storage.getUser(userId);
      } else if (req.user.localUser) {
        user = req.user.localUser;
        userId = user.id;
      }
      
      const workHours = await storage.getWorkHoursById(req.params.id);
      
      if (!workHours) {
        return res.status(404).json({ message: "Work hours entry not found" });
      }

      // Check permissions
      if (user?.role !== 'admin' && user?.role !== 'team_leader' && workHours.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = updateWorkHoursSchema.parse(req.body);
      
      // Convert types for database
      const updates: any = { ...validatedData };
      if (validatedData.workDate) {
        updates.workDate = new Date(validatedData.workDate);
      }
      
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

  app.delete("/api/work-hours/:id", requireAuth, async (req: any, res) => {
    try {
      let userId, user;
      if (req.user.claims?.sub) {
        userId = req.user.claims.sub;
        user = await storage.getUser(userId);
      } else if (req.user.localUser) {
        user = req.user.localUser;
        userId = user.id;
      }
      
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
  app.get("/api/job-orders", requireAuth, async (req, res) => {
    try {
      const jobOrders = await storage.getJobOrders();
      res.json(jobOrders);
    } catch (error) {
      console.error("Error fetching job orders:", error);
      res.status(500).json({ message: "Failed to fetch job orders" });
    }
  });

  app.post("/api/job-orders", requireAuth, async (req: any, res) => {
    try {
      let userId, user;
      if (req.user.claims?.sub) {
        userId = req.user.claims.sub;
        user = await storage.getUser(userId);
      } else if (req.user.localUser) {
        user = req.user.localUser;
        userId = user.id;
      }
      
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

  // Admin route to create new users
  app.post("/api/users/create", requireAuth, async (req: any, res) => {
    try {
      let user;
      if (req.user.claims?.sub) {
        const userId = req.user.claims.sub;
        user = await storage.getUser(userId);
      } else if (req.user.localUser) {
        user = req.user.localUser;
      }
      
      // Only admins can create users
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const userData = registerSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username già esistente" });
      }
      
      const newUser = await storage.createLocalUser(userData);
      res.json(newUser);
    } catch (error: any) {
      console.error("Error creating user:", error);
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
      res.status(500).json({ message: "Errore nella creazione dell'utente" });
    }
  });

  // User management routes (admin only)
  app.get("/api/users", requireAuth, async (req: any, res) => {
    try {
      let userId, user;
      if (req.user.claims?.sub) {
        userId = req.user.claims.sub;
        user = await storage.getUser(userId);
      } else if (req.user.localUser) {
        user = req.user.localUser;
        userId = user.id;
      }
      
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

  app.put("/api/users/:id/role", requireAuth, async (req: any, res) => {
    try {
      let userId, user;
      if (req.user.claims?.sub) {
        userId = req.user.claims.sub;
        user = await storage.getUser(userId);
      } else if (req.user.localUser) {
        user = req.user.localUser;
        userId = user.id;
      }
      
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

  app.delete("/api/users/:id", requireAuth, async (req: any, res) => {
    try {
      let userId, user;
      if (req.user.claims?.sub) {
        userId = req.user.claims.sub;
        user = await storage.getUser(userId);
      } else if (req.user.localUser) {
        user = req.user.localUser;
        userId = user.id;
      }
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Cannot delete yourself
      if (req.params.id === userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      await storage.deleteUser(req.params.id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
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

  // Equipment routes
  app.get("/api/equipment", requireAuth, async (req: any, res) => {
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

      let equipment;
      if (user.role === 'operator') {
        // Operators can only see their assigned equipment
        equipment = await storage.getEquipmentByOperator(userId);
      } else {
        // Team leaders and admins can see all equipment
        equipment = await storage.getAllEquipment();
      }
      
      res.json(equipment);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      res.status(500).json({ message: "Failed to fetch equipment" });
    }
  });

  app.post("/api/equipment", requireAuth, async (req: any, res) => {
    try {
      let userId, user;
      if (req.user.claims?.sub) {
        userId = req.user.claims.sub;
        user = await storage.getUser(userId);
      } else if (req.user.localUser) {
        user = req.user.localUser;
        userId = user.id;
      }
      
      if (!user || (user.role !== 'admin' && user.role !== 'team_leader')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = insertEquipmentSchema.parse(req.body);
      
      // Convert data and handle null values properly
      const equipmentData = {
        ...validatedData,
        calibrationExpiry: (validatedData.calibrationExpiry && validatedData.calibrationExpiry !== '') ? new Date(validatedData.calibrationExpiry) : null,
        assignedOperatorId: validatedData.assignedOperatorId || null,
        internalSerialNumber: validatedData.internalSerialNumber || null,
        model: validatedData.model || null,
        angle: validatedData.angle || null,
        frequency: validatedData.frequency || null,
        dimension: validatedData.dimension || null,
      };
      
      const equipment = await storage.createEquipment(equipmentData);
      res.json(equipment);
    } catch (error) {
      console.error("Error creating equipment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create equipment" });
    }
  });

  app.get("/api/equipment/:id", requireAuth, async (req: any, res) => {
    try {
      let userId, user;
      if (req.user.claims?.sub) {
        userId = req.user.claims.sub;
        user = await storage.getUser(userId);
      } else if (req.user.localUser) {
        user = req.user.localUser;
        userId = user.id;
      }
      
      const equipment = await storage.getEquipmentById(req.params.id);
      
      if (!equipment) {
        return res.status(404).json({ message: "Equipment not found" });
      }

      // Check permissions
      if (user?.role === 'operator' && equipment.assignedOperatorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(equipment);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      res.status(500).json({ message: "Failed to fetch equipment" });
    }
  });

  app.put("/api/equipment/:id", requireAuth, async (req: any, res) => {
    try {
      let userId, user;
      if (req.user.claims?.sub) {
        userId = req.user.claims.sub;
        user = await storage.getUser(userId);
      } else if (req.user.localUser) {
        user = req.user.localUser;
        userId = user.id;
      }
      
      if (!user || (user.role !== 'admin' && user.role !== 'team_leader')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = updateEquipmentSchema.parse(req.body);
      
      // Convert calibrationExpiry to Date if provided and handle null operator
      const updates: any = { ...validatedData };
      if (validatedData.calibrationExpiry && validatedData.calibrationExpiry !== '') {
        updates.calibrationExpiry = new Date(validatedData.calibrationExpiry);
      } else if (validatedData.calibrationExpiry === null || validatedData.calibrationExpiry === undefined || validatedData.calibrationExpiry === '') {
        updates.calibrationExpiry = null;
      }
      if (validatedData.assignedOperatorId === null || validatedData.assignedOperatorId === undefined) {
        updates.assignedOperatorId = null;
      }
      
      const equipment = await storage.updateEquipment(req.params.id, updates);
      res.json(equipment);
    } catch (error) {
      console.error("Error updating equipment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update equipment" });
    }
  });

  app.delete("/api/equipment/:id", requireAuth, async (req: any, res) => {
    try {
      let userId, user;
      if (req.user.claims?.sub) {
        userId = req.user.claims.sub;
        user = await storage.getUser(userId);
      } else if (req.user.localUser) {
        user = req.user.localUser;
        userId = user.id;
      }
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get equipment info to delete associated files
      const equipment = await storage.getEquipmentById(req.params.id);
      if (equipment) {
        if (equipment.calibrationCertificate) {
          deleteFile(equipment.calibrationCertificate);
        }
        if (equipment.equipmentPhoto) {
          deleteFile(equipment.equipmentPhoto);
        }
      }

      await storage.deleteEquipment(req.params.id);
      res.json({ message: "Equipment deleted successfully" });
    } catch (error) {
      console.error("Error deleting equipment:", error);
      res.status(500).json({ message: "Failed to delete equipment" });
    }
  });

  // File upload route for equipment
  app.post("/api/equipment/:id/upload", requireAuth, upload.fields([
    { name: 'calibrationCertificate', maxCount: 1 },
    { name: 'equipmentPhoto', maxCount: 1 }
  ]), async (req: any, res) => {
    try {
      let userId, user;
      if (req.user.claims?.sub) {
        userId = req.user.claims.sub;
        user = await storage.getUser(userId);
      } else if (req.user.localUser) {
        user = req.user.localUser;
        userId = user.id;
      }
      
      if (!user || (user.role !== 'admin' && user.role !== 'team_leader')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const equipmentId = req.params.id;
      const equipment = await storage.getEquipmentById(equipmentId);
      
      if (!equipment) {
        return res.status(404).json({ message: "Equipment not found" });
      }

      const updates: any = {};
      
      // Handle calibration certificate upload
      if (req.files && req.files.calibrationCertificate) {
        const certificateFile = req.files.calibrationCertificate[0];
        // Delete old certificate if exists
        if (equipment.calibrationCertificate) {
          deleteFile(equipment.calibrationCertificate);
        }
        updates.calibrationCertificate = certificateFile.filename;
      }

      // Handle equipment photo upload
      if (req.files && req.files.equipmentPhoto) {
        const photoFile = req.files.equipmentPhoto[0];
        // Delete old photo if exists
        if (equipment.equipmentPhoto) {
          deleteFile(equipment.equipmentPhoto);
        }
        updates.equipmentPhoto = photoFile.filename;
      }

      if (Object.keys(updates).length > 0) {
        await storage.updateEquipment(equipmentId, updates);
      }

      res.json({ message: "Files uploaded successfully", updates });
    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(500).json({ message: "Failed to upload files" });
    }
  });

  // File download route
  app.get("/api/equipment/:id/download/:fileType", requireAuth, async (req: any, res) => {
    try {
      let userId, user;
      if (req.user.claims?.sub) {
        userId = req.user.claims.sub;
        user = await storage.getUser(userId);
      } else if (req.user.localUser) {
        user = req.user.localUser;
        userId = user.id;
      }

      const equipment = await storage.getEquipmentById(req.params.id);
      
      if (!equipment) {
        return res.status(404).json({ message: "Equipment not found" });
      }

      // Check permissions - operators can only access their assigned equipment
      if (user?.role === 'operator' && equipment.assignedOperatorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const fileType = req.params.fileType;
      let fileName: string | null = null;
      
      if (fileType === 'certificate' && equipment.calibrationCertificate) {
        fileName = equipment.calibrationCertificate;
      } else if (fileType === 'photo' && equipment.equipmentPhoto) {
        fileName = equipment.equipmentPhoto;
      }

      if (!fileName) {
        return res.status(404).json({ message: "File not found" });
      }

      const filePath = path.join(process.cwd(), 'uploads', fileName);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      res.download(filePath);
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // User management routes for admin/team leaders
  app.put("/api/users/:id/status", requireAuth, async (req: any, res) => {
    try {
      let currentUser;
      if (req.user.claims?.sub) {
        const userId = req.user.claims.sub;
        currentUser = await storage.getUser(userId);
      } else if (req.user.localUser) {
        currentUser = req.user.localUser;
      }

      // Only admins and team leaders can enable/disable users
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'team_leader')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ message: "Invalid enabled status" });
      }

      const updatedUser = await storage.updateUserStatus(req.params.id, enabled);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
