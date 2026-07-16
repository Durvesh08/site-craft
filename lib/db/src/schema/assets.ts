import { pgTable, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { projectsTable } from "./projects";
import { usersTable } from "./auth";

export const assetTypeEnum = pgEnum("asset_type", [
  "image",
  "video",
  "document",
  "generated",
]);

export const assetsTable = pgTable("assets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  type: assetTypeEnum("type").notNull(),
  url: text("url").notNull(),
  size: integer("size").notNull().default(0),
  mimeType: text("mime_type").notNull().default("application/octet-stream"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAssetSchema = createInsertSchema(assetsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assetsTable.$inferSelect;
