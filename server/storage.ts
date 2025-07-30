import {
  users,
  workHours,
  jobOrders,
  equipment,
  type User,
  type UpsertUser,
  type WorkHours,
  type InsertWorkHours,
  type WorkHoursWithUser,
  type JobOrder,
  type InsertJobOrder,
  type RegisterUser,
  type LoginUser,
  type InsertEquipment,
  type Equipment,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
  // Local auth operations
  getUserByUsername(username: string): Promise<User | undefined>;
  createLocalUser(user: RegisterUser): Promise<User>;
  authenticateUser(username: string, password: string): Promise<User | null>;

  // Work hours operations
  createWorkHours(workHours: InsertWorkHours): Promise<WorkHours>;
  getWorkHoursByUser(userId: string, startDate?: Date, endDate?: Date): Promise<WorkHoursWithUser[]>;
  getWorkHoursById(id: string): Promise<WorkHoursWithUser | undefined>;
  updateWorkHours(id: string, updates: Partial<InsertWorkHours>): Promise<WorkHours>;
  deleteWorkHours(id: string): Promise<void>;
  getAllWorkHours(filters?: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    activityType?: string;
    jobNumber?: string;
  }): Promise<WorkHoursWithUser[]>;

  // Job orders operations
  createJobOrder(jobOrder: InsertJobOrder): Promise<JobOrder>;
  getJobOrders(): Promise<JobOrder[]>;
  getJobOrderByNumber(jobNumber: string): Promise<JobOrder | undefined>;

  // Equipment operations
  createEquipment(equipment: InsertEquipment): Promise<Equipment>;
  getEquipmentByOperator(operatorId: string): Promise<Equipment[]>;
  getAllEquipment(): Promise<Equipment[]>;
  getEquipmentById(id: string): Promise<Equipment | undefined>;
  updateEquipment(id: string, updates: Partial<InsertEquipment>): Promise<Equipment>;
  deleteEquipment(id: string): Promise<void>;

  // Statistics
  getUserHoursStats(userId: string): Promise<{
    todayHours: number;
    weekHours: number;
    monthHours: number;
    overtimeWeekly: number;
    overtimeExtra: number;
    overtimeHoliday: number;
  }>;
  getTeamHoursStats(teamId?: string): Promise<{
    totalMembers: number;
    activeJobs: number;
    totalHours: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role as any));
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role: role as any, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    // First delete all work hours entries for this user
    await db.delete(workHours).where(eq(workHours.userId, id));
    // Then delete the user
    await db.delete(users).where(eq(users.id, id));
  }

  // Local auth operations
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createLocalUser(userData: RegisterUser): Promise<User> {
    // Generate unique email if provided, otherwise set to null
    const email = userData.email && userData.email.trim() !== '' 
      ? userData.email 
      : null;

    const [user] = await db
      .insert(users)
      .values({
        username: userData.username,
        password: userData.password, // In production, hash this!
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: email,  
        role: userData.role,
        authType: 'local'
      })
      .returning();
    return user;
  }

  async authenticateUser(username: string, password: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.username, username),
        eq(users.password, password),
        eq(users.authType, 'local')
      ));
    return user || null;
  }

  // Work hours operations
  async createWorkHours(workHoursData: InsertWorkHours): Promise<WorkHours> {
    const [workHour] = await db
      .insert(workHours)
      .values(workHoursData)
      .returning();
    return workHour;
  }

  async getWorkHoursByUser(userId: string, startDate?: Date, endDate?: Date): Promise<WorkHoursWithUser[]> {
    const conditions = [eq(workHours.userId, userId)];
    
    if (startDate) {
      conditions.push(gte(workHours.workDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(workHours.workDate, endDate));
    }

    const results = await db
      .select({
        id: workHours.id,
        userId: workHours.userId,
        operatorName: workHours.operatorName,
        workDate: workHours.workDate,
        jobNumber: workHours.jobNumber,
        jobName: workHours.jobName,
        moduleNumber: workHours.moduleNumber,
        activityType: workHours.activityType,
        repairCompany: workHours.repairCompany,
        hoursWorked: workHours.hoursWorked,
        notes: workHours.notes,
        createdAt: workHours.createdAt,
        updatedAt: workHours.updatedAt,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          role: users.role,
          teamId: users.teamId,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }
      })
      .from(workHours)
      .innerJoin(users, eq(workHours.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(workHours.workDate));
      
    return results.map(result => ({
      ...result,
      user: result.user
    }));
  }

  async getWorkHoursById(id: string): Promise<WorkHoursWithUser | undefined> {
    const [result] = await db
      .select({
        id: workHours.id,
        userId: workHours.userId,
        operatorName: workHours.operatorName,
        workDate: workHours.workDate,
        jobNumber: workHours.jobNumber,
        jobName: workHours.jobName,
        moduleNumber: workHours.moduleNumber,
        activityType: workHours.activityType,
        repairCompany: workHours.repairCompany,
        hoursWorked: workHours.hoursWorked,
        notes: workHours.notes,
        createdAt: workHours.createdAt,
        updatedAt: workHours.updatedAt,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          role: users.role,
          teamId: users.teamId,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }
      })
      .from(workHours)
      .innerJoin(users, eq(workHours.userId, users.id))
      .where(eq(workHours.id, id));

    if (!result) return undefined;
    
    return {
      ...result,
      user: result.user
    };
  }

  async updateWorkHours(id: string, updates: Partial<InsertWorkHours>): Promise<WorkHours> {
    const [workHour] = await db
      .update(workHours)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workHours.id, id))
      .returning();
    return workHour;
  }

  async deleteWorkHours(id: string): Promise<void> {
    await db.delete(workHours).where(eq(workHours.id, id));
  }

  async getAllWorkHours(filters?: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    activityType?: string;
    jobNumber?: string;
  }): Promise<WorkHoursWithUser[]> {
    const conditions = [];
    if (filters?.startDate) {
      conditions.push(gte(workHours.workDate, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(workHours.workDate, filters.endDate));
    }
    if (filters?.userId) {
      conditions.push(eq(workHours.userId, filters.userId));
    }
    if (filters?.activityType) {
      conditions.push(eq(workHours.activityType, filters.activityType as any));
    }
    if (filters?.jobNumber) {
      conditions.push(eq(workHours.jobNumber, filters.jobNumber));
    }

    let query = db
      .select({
        id: workHours.id,
        userId: workHours.userId,
        operatorName: workHours.operatorName,
        workDate: workHours.workDate,
        jobNumber: workHours.jobNumber,
        jobName: workHours.jobName,
        moduleNumber: workHours.moduleNumber,
        activityType: workHours.activityType,
        repairCompany: workHours.repairCompany,
        hoursWorked: workHours.hoursWorked,
        notes: workHours.notes,
        createdAt: workHours.createdAt,
        updatedAt: workHours.updatedAt,
        user: {
          id: users.id,
          username: users.username,
          password: users.password,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          role: users.role,
          teamId: users.teamId,
          authType: users.authType,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }
      })
      .from(workHours)
      .innerJoin(users, eq(workHours.userId, users.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(desc(workHours.workDate));
    return results.map(result => ({
      ...result,
      user: result.user
    }));
  }

  // Job orders operations
  async createJobOrder(jobOrderData: InsertJobOrder): Promise<JobOrder> {
    const [jobOrder] = await db
      .insert(jobOrders)
      .values(jobOrderData)
      .returning();
    return jobOrder;
  }

  async getJobOrders(): Promise<JobOrder[]> {
    return await db.select().from(jobOrders).orderBy(asc(jobOrders.jobNumber));
  }

  async getJobOrderByNumber(jobNumber: string): Promise<JobOrder | undefined> {
    const [jobOrder] = await db.select().from(jobOrders).where(eq(jobOrders.jobNumber, jobNumber));
    return jobOrder;
  }

  // Statistics
  async getUserHoursStats(userId: string): Promise<{
    todayHours: number;
    weekHours: number;
    monthHours: number;
    overtimeWeekly: number;
    overtimeExtra: number;
    overtimeHoliday: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Italian holidays 2025 (you can update this yearly)
    const italianHolidays2025 = [
      '2025-01-01', // Capodanno
      '2025-01-06', // Epifania
      '2025-04-20', // Pasquetta
      '2025-04-25', // Festa della Liberazione
      '2025-05-01', // Festa del Lavoro
      '2025-06-02', // Festa della Repubblica
      '2025-08-15', // Ferragosto
      '2025-11-01', // Ognissanti
      '2025-12-08', // Immacolata Concezione
      '2025-12-25', // Natale
      '2025-12-26', // Santo Stefano
    ];

    // Get today's hours
    const todayEntries = await db
      .select()
      .from(workHours)
      .where(and(
        eq(workHours.userId, userId),
        gte(workHours.workDate, today)
      ));

    // Get week's hours
    const weekEntries = await db
      .select()
      .from(workHours)
      .where(and(
        eq(workHours.userId, userId),
        gte(workHours.workDate, weekStart)
      ));

    // Get month's hours
    const monthEntries = await db
      .select()
      .from(workHours)
      .where(and(
        eq(workHours.userId, userId),
        gte(workHours.workDate, monthStart)
      ));

    // Calculate overtime
    let overtimeWeekly = 0;  // Monday-Friday overtime (beyond 8h/day)
    let overtimeExtra = 0;   // Saturday
    let overtimeHoliday = 0; // Sunday + Italian holidays

    monthEntries.forEach(entry => {
      const date = new Date(entry.workDate);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const dateString = date.toISOString().split('T')[0];
      const hours = parseFloat(entry.hoursWorked);
      
      const isItalianHoliday = italianHolidays2025.includes(dateString);
      
      if (dayOfWeek === 0 || isItalianHoliday) {
        // Sunday or Italian holiday - all hours are holiday overtime
        overtimeHoliday += hours;
      } else if (dayOfWeek === 6) {
        // Saturday - all hours are extra overtime
        overtimeExtra += hours;
      } else {
        // Monday-Friday - overtime beyond 8 hours
        if (hours > 8) {
          overtimeWeekly += (hours - 8);
        }
      }
    });

    return {
      todayHours: todayEntries.reduce((sum, entry) => sum + parseFloat(entry.hoursWorked), 0),
      weekHours: weekEntries.reduce((sum, entry) => sum + parseFloat(entry.hoursWorked), 0),
      monthHours: monthEntries.reduce((sum, entry) => sum + parseFloat(entry.hoursWorked), 0),
      overtimeWeekly: overtimeWeekly,
      overtimeExtra: overtimeExtra,
      overtimeHoliday: overtimeHoliday,
    };
  }

  async getTeamHoursStats(teamId?: string): Promise<{
    totalMembers: number;
    activeJobs: number;
    totalHours: number;
  }> {
    // Get team members count
    const teamMembers = teamId 
      ? await db.select().from(users).where(eq(users.teamId, teamId))
      : await db.select().from(users);

    // Get active job orders count
    const activeJobs = await db.select().from(jobOrders).where(eq(jobOrders.status, 'active'));

    // Get total hours for the month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthHours = await db
      .select()
      .from(workHours)
      .where(gte(workHours.workDate, monthStart));

    return {
      totalMembers: teamMembers.length,
      activeJobs: activeJobs.length,
      totalHours: monthHours.reduce((sum, entry) => sum + parseFloat(entry.hoursWorked), 0),
    };
  }

  // Equipment operations
  async createEquipment(equipmentData: any): Promise<Equipment> {
    const [equipmentEntry] = await db
      .insert(equipment)
      .values({
        equipmentType: equipmentData.equipmentType,
        brand: equipmentData.brand,
        internalSerialNumber: equipmentData.internalSerialNumber,
        serialNumber: equipmentData.serialNumber,
        calibrationExpiry: equipmentData.calibrationExpiry,
        assignedOperatorId: equipmentData.assignedOperatorId,
        status: equipmentData.status,
        calibrationCertificate: equipmentData.calibrationCertificate,
        equipmentPhoto: equipmentData.equipmentPhoto,
      })
      .returning();
    return equipmentEntry;
  }

  async getEquipmentByOperator(operatorId: string): Promise<any[]> {
    return await db
      .select({
        id: equipment.id,
        equipmentType: equipment.equipmentType,
        brand: equipment.brand,
        internalSerialNumber: equipment.internalSerialNumber,
        serialNumber: equipment.serialNumber,
        calibrationExpiry: equipment.calibrationExpiry,
        assignedOperatorId: equipment.assignedOperatorId,
        status: equipment.status,
        calibrationCertificate: equipment.calibrationCertificate,
        equipmentPhoto: equipment.equipmentPhoto,
        createdAt: equipment.createdAt,
        updatedAt: equipment.updatedAt,
        assignedOperator: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          username: users.username,
        }
      })
      .from(equipment)
      .leftJoin(users, eq(equipment.assignedOperatorId, users.id))
      .where(eq(equipment.assignedOperatorId, operatorId))
      .orderBy(asc(equipment.brand));
  }

  async getAllEquipment(): Promise<any[]> {
    return await db
      .select({
        id: equipment.id,
        equipmentType: equipment.equipmentType,
        brand: equipment.brand,
        internalSerialNumber: equipment.internalSerialNumber,
        serialNumber: equipment.serialNumber,
        calibrationExpiry: equipment.calibrationExpiry,
        assignedOperatorId: equipment.assignedOperatorId,
        status: equipment.status,
        calibrationCertificate: equipment.calibrationCertificate,
        equipmentPhoto: equipment.equipmentPhoto,
        createdAt: equipment.createdAt,
        updatedAt: equipment.updatedAt,
        assignedOperator: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          username: users.username,
        }
      })
      .from(equipment)
      .leftJoin(users, eq(equipment.assignedOperatorId, users.id))
      .orderBy(asc(equipment.brand), asc(equipment.internalSerialNumber));
  }

  async getEquipmentById(id: string): Promise<Equipment | undefined> {
    const [equipmentEntry] = await db
      .select()
      .from(equipment)
      .where(eq(equipment.id, id));
    return equipmentEntry;
  }

  async updateEquipment(id: string, updates: any): Promise<Equipment> {
    const updateData: any = { updatedAt: new Date() };
    
    if (updates.equipmentType !== undefined) updateData.equipmentType = updates.equipmentType;
    if (updates.brand !== undefined) updateData.brand = updates.brand;
    if (updates.internalSerialNumber !== undefined) updateData.internalSerialNumber = updates.internalSerialNumber;
    if (updates.serialNumber !== undefined) updateData.serialNumber = updates.serialNumber;
    if (updates.calibrationExpiry !== undefined) updateData.calibrationExpiry = updates.calibrationExpiry;
    if (updates.assignedOperatorId !== undefined) updateData.assignedOperatorId = updates.assignedOperatorId;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.calibrationCertificate !== undefined) updateData.calibrationCertificate = updates.calibrationCertificate;
    if (updates.equipmentPhoto !== undefined) updateData.equipmentPhoto = updates.equipmentPhoto;
    
    const [equipmentEntry] = await db
      .update(equipment)
      .set(updateData)
      .where(eq(equipment.id, id))
      .returning();
    return equipmentEntry;
  }

  async deleteEquipment(id: string): Promise<void> {
    await db.delete(equipment).where(eq(equipment.id, id));
  }
}

export const storage = new DatabaseStorage();
