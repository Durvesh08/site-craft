import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./auth";
import { projectsTable } from "./projects";
import { aiJobsTable } from "./ai-jobs";

export const tokenUsageTable = pgTable("token_usage", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
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

export const insertTokenUsageSchema = createInsertSchema(tokenUsageTable).omit({
  id: true,
  createdAt: true,
}) as any;

export type InsertTokenUsage = z.infer<typeof insertTokenUsageSchema>;
export type TokenUsage = typeof tokenUsageTable.$inferSelect;
