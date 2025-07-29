import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Role enum
export const roleEnum = pgEnum('role', ['operator', 'team_leader', 'admin']);

// Activity type enum
export const activityTypeEnum = pgEnum('activity_type', [
  'NDE-MT/PT',
  'NDE-UT', 
  'RIP.NDE - MT/PT',
  'RIP.NDE - UT',
  'ISPEZIONE WI',
  'RIP.ISPEZIONE WI'
]);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: roleEnum("role").notNull().default('operator'),
  teamId: varchar("team_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Work hours entries table
export const workHours = pgTable("work_hours", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  operatorName: varchar("operator_name").notNull(),
  workDate: timestamp("work_date").notNull(),
  jobNumber: varchar("job_number").notNull(),
  jobName: varchar("job_name").notNull(),
  activityType: activityTypeEnum("activity_type").notNull(),
  repairCompany: varchar("repair_company"),
  hoursWorked: decimal("hours_worked", { precision: 4, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Job orders table for reference
export const jobOrders = pgTable("job_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobNumber: varchar("job_number").notNull().unique(),
  jobName: varchar("job_name").notNull(),
  description: text("description"),
  status: varchar("status").notNull().default('active'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkHoursSchema = createInsertSchema(workHours).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobOrderSchema = createInsertSchema(jobOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertWorkHours = z.infer<typeof insertWorkHoursSchema>;
export type WorkHours = typeof workHours.$inferSelect;
export type InsertJobOrder = z.infer<typeof insertJobOrderSchema>;
export type JobOrder = typeof jobOrders.$inferSelect;

// Extended work hours with user info for display
export type WorkHoursWithUser = WorkHours & {
  user: User;
};
