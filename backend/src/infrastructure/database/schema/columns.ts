import { customType } from "drizzle-orm/sqlite-core";

/**
 * A SQLite INTEGER read and written as `bigint` (ADR-0002). Requires a connection
 * opened with `openSqlite` (safe integers on). Both directions throw instead of
 * silently accepting a `number`, so money can never lose precision.
 * Every integer column uses this type: with safe integers on, Drizzle's own
 * `integer()` would be typed `number` but return `bigint`.
 */
export const bigintInteger = customType<{ data: bigint; driverData: bigint }>({
  dataType: () => "integer",
  toDriver: (value) => {
    if (typeof value !== "bigint") {
      throw new TypeError(`Expected a bigint for an INTEGER column, got ${typeof value}.`);
    }
    return value;
  },
  fromDriver: (value) => {
    if (typeof value !== "bigint") {
      throw new TypeError(
        `Expected the driver to return a bigint, got ${typeof value}. Was the connection opened with openSqlite?`,
      );
    }
    return value;
  },
});
