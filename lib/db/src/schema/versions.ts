import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { projectsTable } from "./projects";
import { usersTable } from "./auth";

export const versionsTable = pgTable("versions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  label: text("label"),
  generatedHtml: text("generated_html"),
  designTokensJson: text("design_tokens_json"),
  qualityScoresJson: text("quality_scores_json"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const activityLogsTable = pgTable("activity_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  description: text("description").notNull(),
  projectId: text("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  projectName: text("project_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVersionSchema = createInsertSchema(versionsTable).omit({
  id: true,
  createdAt: true,
}) as any;

export const insertActivityLogSchema = createInsertSchema(activityLogsTable).omit({
  id: true,
  createdAt: true,
}) as any;

export type InsertVersion = z.infer<typeof insertVersionSchema>;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type Version = typeof versionsTable.$inferSelect;
export type ActivityLog = typeof activityLogsTable.$inferSelect;
