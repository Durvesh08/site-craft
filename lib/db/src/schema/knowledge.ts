import { pgTable, text, integer, jsonb } from "drizzle-orm/pg-core";

export const layoutSkeletonsTable = pgTable("layout_skeletons", {
  id: text("id").primaryKey(),
  archetypeKey: text("archetype_key").notNull(), // matches designArchetypes.ts keys
  sectionsJson: jsonb("sections_json").notNull(), // ordered [{type, required, variants}]
  version: integer("version").notNull().default(1),
});
