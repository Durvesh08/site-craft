import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./auth";
import { projectsTable } from "./projects";
import { aiJobsTable } from "./ai-jobs";
import { workspacesTable } from "./workspace";

export const tokenUsageTable = pgTable("token_usage", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").references(() => workspacesTable.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  jobId: text("job_id").references(() => aiJobsTable.id, { onDelete: "set null" }),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const usageEventsTable = pgTable("usage_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // ai_tokens | build | deployment | storage | connector_api
  amount: integer("amount").notNull().default(1),
  metadataJson: text("metadata_json"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTokenUsageSchema = createInsertSchema(tokenUsageTable).omit({
  id: true,
  createdAt: true,
}) as any;

export type InsertTokenUsage = z.infer<typeof insertTokenUsageSchema>;
export type TokenUsage = typeof tokenUsageTable.$inferSelect;
export type UsageEvent = typeof usageEventsTable.$inferSelect;
