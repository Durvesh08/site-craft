import { pgTable, text, timestamp, real, integer, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./auth";

export const promptModelEnum = pgEnum("prompt_model", [
  // Legacy values — kept for backward compat with existing rows
  "gemini-flash",      // → gemini-2.5-flash (thinking disabled)
  "gemini-pro",        // → gemini-2.5-pro
  // New explicit options
  "gemini-flash-fast", // → gemini-2.0-flash — zero thinking overhead, cheapest & fastest
  "gemini-1.5-flash",  // → gemini-1.5-flash — legacy but still available, no thinking
]);

export const promptTemplatesTable = pgTable("prompt_templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  agentRole: text("agent_role").notNull(),
  description: text("description").notNull().default(""),
  systemPrompt: text("system_prompt").notNull(),
  userPromptTemplate: text("user_prompt_template").notNull(),
  model: promptModelEnum("model").notNull().default("gemini-flash"),
  temperature: real("temperature").notNull().default(0.7),
  version: text("version").notNull().default("1.0.0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPromptTemplateSchema = createInsertSchema(promptTemplatesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}) as any;

export type InsertPromptTemplate = z.infer<typeof insertPromptTemplateSchema>;
export type PromptTemplate = typeof promptTemplatesTable.$inferSelect;
