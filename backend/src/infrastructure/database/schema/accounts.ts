import type { AccountKind, Currency } from "@solvia/core";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { bigintInteger } from "./columns.ts";

// No CHECK constraints: @solvia/core validates every account before it is written.
export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  institution: text("institution"),
  kind: text("kind").$type<AccountKind>().notNull(),
  currency: text("currency").$type<Currency>().notNull(),
  // In the account's currency, so the currency is not stored twice (BR-22).
  overdraftLimitMinor: bigintInteger("overdraft_limit_minor"),
  archivedAt: text("archived_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
