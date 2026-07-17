import {
  pgTable,
  text,
  timestamp,
  integer,
  real,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { projectsTable } from "./projects";
import { usersTable } from "./auth";

export const jobTypeEnum = pgEnum("job_type", [
  "generate",
  "chat-edit",
  "regenerate-section",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const stepStatusEnum = pgEnum("step_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
]);

export const aiJobsTable = pgTable("ai_jobs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  type: jobTypeEnum("type").notNull(),
  status: jobStatusEnum("status").notNull().default("pending"),
  progress: real("progress").notNull().default(0),
  currentStep: text("current_step"),
  resultJson: text("result_json"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const aiJobStepsTable = pgTable("ai_job_steps", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobId: text("job_id")
    .notNull()
    .references(() => aiJobsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: stepStatusEnum("status").notNull().default("pending"),
  order: integer("order").notNull(),
  outputJson: text("output_json"),
  error: text("error"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const insertAiJobSchema = createInsertSchema(aiJobsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}) as any;

export const insertAiJobStepSchema = createInsertSchema(aiJobStepsTable).omit({
  id: true,
}) as any;

export type InsertAiJob = z.infer<typeof insertAiJobSchema>;
export type InsertAiJobStep = z.infer<typeof insertAiJobStepSchema>;
export type AiJob = typeof aiJobsTable.$inferSelect;
export type AiJobStep = typeof aiJobStepsTable.$inferSelect;
