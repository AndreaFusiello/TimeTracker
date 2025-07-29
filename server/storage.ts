import {
  users,
  workHours,
  jobOrders,
  type User,
  type UpsertUser,
  type WorkHours,
  type InsertWorkHours,
  type WorkHoursWithUser,
  type JobOrder,
  type InsertJobOrder,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User>;

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

  // Statistics
  getUserHoursStats(userId: string): Promise<{
    todayHours: number;
    weekHours: number;
    monthHours: number;
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
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

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

    return {
      todayHours: todayEntries.reduce((sum, entry) => sum + parseFloat(entry.hoursWorked), 0),
      weekHours: weekEntries.reduce((sum, entry) => sum + parseFloat(entry.hoursWorked), 0),
      monthHours: monthEntries.reduce((sum, entry) => sum + parseFloat(entry.hoursWorked), 0),
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
}

export const storage = new DatabaseStorage();
