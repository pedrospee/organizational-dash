import Database from "better-sqlite3";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import { openSqlite } from "../client.ts";
import { bigintInteger } from "./columns.ts";

// A test-only table; real tables live in the schema folder.
const amounts = sqliteTable("amounts", {
  id: text("id").primaryKey(),
  amountMinor: bigintInteger("amount_minor").notNull(),
});
const CREATE_AMOUNTS = "CREATE TABLE amounts (id TEXT PRIMARY KEY, amount_minor INTEGER NOT NULL)";

const ABOVE_MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER) * 1_000n + 7n;

describe("bigintInteger (ADR-0002)", () => {
  it("round-trips an amount above Number.MAX_SAFE_INTEGER as bigint, stored as INTEGER", () => {
    const sqlite = openSqlite(":memory:");
    sqlite.exec(CREATE_AMOUNTS);
    const db = drizzle(sqlite);

    db.insert(amounts).values({ id: "a", amountMinor: ABOVE_MAX_SAFE_INTEGER }).run();
    db.insert(amounts).values({ id: "b", amountMinor: -ABOVE_MAX_SAFE_INTEGER }).run();

    expect(db.select().from(amounts).where(eq(amounts.id, "a")).get()).toEqual({
      id: "a",
      amountMinor: ABOVE_MAX_SAFE_INTEGER,
    });
    expect(db.select().from(amounts).where(eq(amounts.id, "b")).get()?.amountMinor).toBe(
      -ABOVE_MAX_SAFE_INTEGER,
    );
    const storageClass = db.get<{ type: string }>(
      sql`SELECT typeof(amount_minor) AS type FROM amounts`,
    );
    expect(storageClass).toEqual({ type: "integer" });
    sqlite.close();
  });

  it("refuses to read through a connection without safe integers", () => {
    const sqlite = new Database(":memory:");
    sqlite.exec(CREATE_AMOUNTS);
    sqlite.prepare("INSERT INTO amounts VALUES ('a', 1050)").run();

    expect(() => drizzle(sqlite).select().from(amounts).get()).toThrow(/Expected the driver/);
    sqlite.close();
  });

  it("refuses to write a number", () => {
    const sqlite = openSqlite(":memory:");
    sqlite.exec(CREATE_AMOUNTS);
    const values = { id: "a", amountMinor: 1050 as unknown as bigint };

    expect(() => drizzle(sqlite).insert(amounts).values(values).run()).toThrow(/Expected a bigint/);
    sqlite.close();
  });
});
