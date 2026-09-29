import type { CategoryNature } from "@solvia/core";
import { type AnySQLiteColumn, sqliteTable, text } from "drizzle-orm/sqlite-core";

// No CHECK constraints: @solvia/core validates the hierarchy before it is written
// (BR-70, BR-71). The foreign key keeps a child from losing its parent.
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nature: text("nature").$type<CategoryNature>().notNull(),
  parentId: text("parent_id").references((): AnySQLiteColumn => categories.id, {
    onDelete: "restrict",
  }),
  archivedAt: text("archived_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
