import type { Currency, ExchangeRateSource, LocalDate } from "@solvia/core";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

// Append-only (BR-81): rows are inserted, never updated or deleted. No CHECK
// constraints: @solvia/core validates every rate before it is written (BR-80, BR-83).
// No foreign keys: a rate describes a currency pair, not an account or a category.
export const exchangeRates = sqliteTable("exchange_rates", {
  id: text("id").primaryKey(),
  baseCurrency: text("base_currency").$type<Currency>().notNull(),
  quoteCurrency: text("quote_currency").$type<Currency>().notNull(),
  // Exact decimal string in canonical form, never REAL (ADR-0002).
  rate: text("rate").notNull(),
  effectiveDate: text("effective_date").$type<LocalDate>().notNull(),
  source: text("source").$type<ExchangeRateSource>().notNull(),
  recordedAt: text("recorded_at").notNull(),
});
