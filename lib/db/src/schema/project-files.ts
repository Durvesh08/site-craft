import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { workspacesTable } from "./workspace";

export const projectFilesTable = pgTable("project_files", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  content: text("content"),
  mimeType: text("mime_type").default("text/plain"),
  size: integer("size").notNull().default(0),
  isDir: boolean("is_dir").notNull().default(false),
  parentPath: text("parent_path").default("/"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ProjectFile = typeof projectFilesTable.$inferSelect;
