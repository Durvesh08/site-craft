import { pgTable, text, integer, jsonb, timestamp, customType } from "drizzle-orm/pg-core";

export const layoutSkeletonsTable = pgTable("layout_skeletons", {
  id: text("id").primaryKey(),
  archetypeKey: text("archetype_key").notNull(), // matches designArchetypes.ts keys
  sectionsJson: jsonb("sections_json").notNull(), // ordered [{type, required, variants}]
  version: integer("version").notNull().default(1),
});

// Custom pgvector type to guarantee compatibility
const pgVector = customType<{ data: number[] }>({
  dataType() {
    return "vector(768)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: unknown): number[] {
    if (typeof value === "string") {
      return value.replace(/[\[\]\s]/g, "").split(",").map(Number);
    }
    return value as number[];
  }
});

export const sectionExemplarsTable = pgTable("section_exemplars", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sectionType: text("section_type").notNull(),
  archetypeKey: text("archetype_key").notNull(),
  industryTag: text("industry_tag"),
  copyPattern: text("copy_pattern").notNull(),
  exampleCopy: text("example_copy").notNull(),
  layoutNotes: text("layout_notes").notNull(),
  qualityScore: integer("quality_score").notNull(),
  status: text("status").notNull().default("pending"), // "pending" | "approved" | "rejected"
  sourceType: text("source_type").notNull(), // "seed" | "feedback-loop"
  embedding: pgVector("embedding"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
