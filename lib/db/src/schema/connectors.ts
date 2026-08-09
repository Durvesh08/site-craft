import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspace";

export const connectorStatusEnum = pgEnum("connector_status", [
  "NOT_CONNECTED",
  "AUTHORIZING",
  "CONNECTED",
  "EXPIRED",
  "ERROR",
  "DISCONNECTED",
]);

export const connectorsTable = pgTable("connectors", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  connectorId: text("connector_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  status: connectorStatusEnum("status").notNull().default("NOT_CONNECTED"),
  accountName: text("account_name"),
  credentialsEncrypted: text("credentials_encrypted"),
  scopesJson: text("scopes_json"),
  lastError: text("last_error"),
  connectedAt: timestamp("connected_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Connector = typeof connectorsTable.$inferSelect;
