import { pgTable, text, timestamp, integer, real, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { projectsTable } from "./projects";
import { usersTable } from "./auth";

export const deploymentStatusEnum = pgEnum("deployment_status", [
  "pending",
  "uploading",
  "verifying",
  "live",
  "failed",
  "rolled_back",
]);

export const deploymentEnvironmentEnum = pgEnum("deployment_environment", [
  "production",
  "staging",
]);

export const deploymentProtocolEnum = pgEnum("deployment_protocol", [
  "ftp",
  "ftps",
  "sftp",
]);

export const deploymentsTable = pgTable("deployments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  status: deploymentStatusEnum("status").notNull().default("pending"),
  environment: deploymentEnvironmentEnum("environment").notNull().default("production"),
  protocol: deploymentProtocolEnum("protocol").notNull().default("ftp"),
  liveUrl: text("live_url"),
  screenshotUrl: text("screenshot_url"),
  ftpHost: text("ftp_host"),
  ftpPort: integer("ftp_port").notNull().default(21),
  lighthouseScore: real("lighthouse_score"),
  filesUploaded: integer("files_uploaded"),
  uploadProgress: integer("upload_progress").notNull().default(0),
  deploymentLog: text("deployment_log"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const domainsTable = pgTable("domains", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  domain: text("domain").notNull(),
  verified: boolean("verified").notNull().default(false),
  sslActive: boolean("ssl_active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDeploymentSchema = createInsertSchema(deploymentsTable).omit({
  id: true,
  createdAt: true,
}) as any;

export const insertDomainSchema = createInsertSchema(domainsTable).omit({
  id: true,
  createdAt: true,
}) as any;

export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type InsertDomain = z.infer<typeof insertDomainSchema>;
export type Deployment = typeof deploymentsTable.$inferSelect;
export type Domain = typeof domainsTable.$inferSelect;
