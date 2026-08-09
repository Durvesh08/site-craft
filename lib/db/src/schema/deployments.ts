import { pgTable, text, timestamp, integer, real, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { projectsTable } from "./projects";
import { usersTable } from "./auth";
import { workspacesTable } from "./workspace";

export const deploymentStatusEnum = pgEnum("deployment_status", [
  "pending",
  "queued",
  "building",
  "uploading",
  "verifying",
  "ready",
  "live",
  "failed",
  "rolled_back",
  "cancelled",
]);

export const deploymentEnvironmentEnum = pgEnum("deployment_environment", [
  "sandbox",
  "staging",
  "production",
]);

export const deploymentProtocolEnum = pgEnum("deployment_protocol", [
  "ftp",
  "ftps",
  "sftp",
  "vercel",
  "netlify",
  "cloudflare_pages"
]);

export const deploymentsTable = pgTable("deployments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").references(() => workspacesTable.id, { onDelete: "cascade" }),
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
  workspaceId: text("workspace_id").references(() => workspacesTable.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  domain: text("domain").notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING | VERIFYING | VERIFIED | ACTIVE | FAILED
  txtVerificationToken: text("txt_verification_token"),
  txtRecord: text("txt_record"),
  cnameRecord: text("cname_record"),
  dnsRecordsJson: text("dns_records_json"),
  verified: boolean("verified").notNull().default(false),
  sslActive: boolean("ssl_active").notNull().default(false),
  verifiedAt: timestamp("verified_at"),
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
