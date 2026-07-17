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
import { usersTable } from "./auth";

export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "generating",
  "ready",
  "deployed",
  "failed",
]);

export const projectsTable = pgTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  businessDescription: text("business_description"),
  industry: text("industry"),
  status: projectStatusEnum("status").notNull().default("draft"),
  theme: text("theme"),
  previewUrl: text("preview_url"),
  liveUrl: text("live_url"),
  generatedHtml: text("generated_html"),
  designTokensJson: text("design_tokens_json"),
  seoScore: real("seo_score"),
  accessibilityScore: real("accessibility_score"),
  performanceScore: real("performance_score"),
  visualScore: real("visual_score"),
  activeJobId: text("active_job_id"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}) as any;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
