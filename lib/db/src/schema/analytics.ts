import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { projectsTable } from "./projects";

export const pageViewsTable = pgTable(
  "page_views",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id").notNull(),
    sessionId: text("session_id"),
    pagePath: text("page_path").notNull().default("/"),
    pageTitle: text("page_title"),
    referrer: text("referrer"),
    referrerSource: text("referrer_source").notNull().default("Direct"), // Direct, Google Search, Twitter / X, etc.
    deviceType: text("device_type").notNull().default("desktop"), // desktop, mobile, tablet
    browser: text("browser").notNull().default("Other"), // Chrome, Safari, Firefox, Edge, etc.
    os: text("os").notNull().default("Other"), // macOS, Windows, iOS, Android, Linux
    country: text("country").default("US"),
    screenResolution: text("screen_resolution"),
    durationSeconds: integer("duration_seconds").default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    projectIdIdx: index("page_views_project_id_idx").on(table.projectId),
    projectCreatedAtIdx: index("page_views_project_created_at_idx").on(table.projectId, table.createdAt),
    projectVisitorIdx: index("page_views_project_visitor_idx").on(table.projectId, table.visitorId),
  })
);

export const insertPageViewSchema = createInsertSchema(pageViewsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertPageView = z.infer<typeof insertPageViewSchema>;
export type PageView = typeof pageViewsTable.$inferSelect;
