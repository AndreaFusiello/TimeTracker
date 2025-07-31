import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  pgEnum,
  boolean,
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
  'RIP.ISPEZIONE WI',
  'DOCUMENTAZIONE'
]);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique(),
  password: varchar("password"), // For local auth
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: roleEnum("role").notNull().default('operator'),
  teamId: varchar("team_id"),
  authType: varchar("auth_type").notNull().default('replit'), // 'replit' or 'local'
  enabled: boolean("enabled").notNull().default(true),
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
  moduleNumber: varchar("module_number"), // Numero modulo (93, 94, etc.)
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

// Local auth schemas
export const registerSchema = z.object({
  username: z.string().min(3, "Username deve essere almeno 3 caratteri"),
  password: z.string().min(4, "Password deve essere almeno 4 caratteri"),
  firstName: z.string().min(1, "Nome richiesto"),
  lastName: z.string().min(1, "Cognome richiesto"),
  email: z.string().optional().or(z.literal("")),
  role: z.enum(['operator', 'team_leader', 'admin']).default('operator'),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username richiesto"),
  password: z.string().min(1, "Password richiesta"),
});

export const insertWorkHoursSchema = createInsertSchema(workHours).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateWorkHoursSchema = z.object({
  workDate: z.string().optional(),
  jobNumber: z.string().optional(),
  jobName: z.string().optional(),
  moduleNumber: z.string().optional(),
  activityType: z.enum([
    'NDE-MT/PT',
    'NDE-UT', 
    'RIP.NDE - MT/PT',
    'RIP.NDE - UT',
    'ISPEZIONE WI',
    'RIP.ISPEZIONE WI',
    'DOCUMENTAZIONE'
  ]).optional(),
  hoursWorked: z.number().optional(),
  notes: z.string().optional(),
});

export const insertJobOrderSchema = createInsertSchema(jobOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Equipment management table for non-destructive testing equipment
export const equipment = pgTable("equipment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  equipmentType: varchar("equipment_type").notNull(), // "magnetic_yoke", "visual", "ultrasonic_instrument", "ut_probe", "calibration_blocks", "various"
  brand: varchar("brand").notNull(),
  model: varchar("model"), // Model field for ultrasonic instruments
  internalSerialNumber: varchar("internal_serial_number"),
  serialNumber: varchar("serial_number").notNull(),
  site: varchar("site").notNull(), // Site location (e.g., "Cimolai Monfalcone")
  // UT Probe specific fields
  angle: varchar("angle"), // Angle for UT probes (e.g., "45°", "60°")
  frequency: varchar("frequency"), // Frequency for UT probes (e.g., "2.25MHz", "5MHz")
  dimension: varchar("dimension"), // Dimension for UT probes (e.g., "10mm", "20mm")
  calibrationExpiry: timestamp("calibration_expiry"), // Not required for UT probes
  assignedOperatorId: varchar("assigned_operator_id").references(() => users.id),
  status: varchar("status").notNull().default("active"), // active, maintenance, retired
  calibrationCertificate: varchar("calibration_certificate"), // File path for calibration certificate
  equipmentPhoto: varchar("equipment_photo"), // File path for equipment photo
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEquipmentSchema = createInsertSchema(equipment).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  calibrationExpiry: z.string().nullable().optional(), // Optional for UT probes, can be null
  internalSerialNumber: z.string().nullable().optional(), // Optional internal serial number
  site: z.string().min(1, "Il sito è obbligatorio"), // Site is required
  model: z.string().nullable().optional(),
  angle: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  dimension: z.string().nullable().optional(),
});

export const updateEquipmentSchema = insertEquipmentSchema.partial().extend({
  calibrationExpiry: z.string().nullable().optional(),
  site: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  angle: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  dimension: z.string().nullable().optional(),
});

export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type UpdateEquipment = z.infer<typeof updateEquipmentSchema>;
export type Equipment = typeof equipment.$inferSelect;

// Equipment relations
export const equipmentRelations = relations(equipment, ({ one }) => ({
  assignedOperator: one(users, {
    fields: [equipment.assignedOperatorId],
    references: [users.id],
  }),
}));

export type InsertWorkHours = z.infer<typeof insertWorkHoursSchema>;
export type WorkHours = typeof workHours.$inferSelect;
export type InsertJobOrder = z.infer<typeof insertJobOrderSchema>;
export type JobOrder = typeof jobOrders.$inferSelect;
export type RegisterUser = z.infer<typeof registerSchema>;
export type LoginUser = z.infer<typeof loginSchema>;

// Extended work hours with user info for display
export type WorkHoursWithUser = WorkHours & {
  user: User;
};
