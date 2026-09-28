import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { backupDatabase } from "./backup.ts";
import type { SqliteConnection } from "./client.ts";

/** Committed migrations. `npm run build` copies them next to the compiled code. */
export const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));

const MIGRATIONS_TABLE = "__drizzle_migrations";

export type MigrationResult =
  | Readonly<{ status: "up-to-date" }>
  | Readonly<{ status: "migrated"; applied: number; backupPath?: string }>;

export class PendingMigrationsError extends Error {
  constructor(pending: number) {
    super(
      `The database has ${pending} pending migration(s). Run \`npm run db:migrate\` before starting Solvia.`,
    );
    this.name = "PendingMigrationsError";
  }
}

/**
 * Applies pending migrations. An existing database is backed up (and the
 * backup verified) first; a brand-new, empty database is not. Nothing happens
 * when there is nothing to apply.
 */
export function migrateDatabase(
  sqlite: SqliteConnection,
  options: { backupDir: string; migrationsFolder?: string },
): MigrationResult {
  const migrationsFolder = options.migrationsFolder ?? MIGRATIONS_FOLDER;
  const pending = countPendingMigrations(sqlite, migrationsFolder);
  if (pending === 0) {
    return { status: "up-to-date" };
  }

  const backupPath = isEmptyDatabase(sqlite)
    ? undefined
    : backupDatabase(sqlite, options.backupDir, "pre-migration");

  // Drizzle applies every pending migration inside one SQLite transaction.
  migrate(drizzle(sqlite), { migrationsFolder });

  return { status: "migrated", applied: pending, ...(backupPath ? { backupPath } : {}) };
}

/** Refuses to continue when the schema is behind the committed migrations. */
export function assertNoPendingMigrations(
  sqlite: SqliteConnection,
  migrationsFolder: string = MIGRATIONS_FOLDER,
): void {
  const pending = countPendingMigrations(sqlite, migrationsFolder);
  if (pending > 0) {
    throw new PendingMigrationsError(pending);
  }
}

/**
 * Uses the same rule as Drizzle's migrator: a migration is pending when it was
 * generated after the most recently applied one.
 */
export function countPendingMigrations(
  sqlite: SqliteConnection,
  migrationsFolder: string = MIGRATIONS_FOLDER,
): number {
  const lastApplied = lastAppliedMigrationMillis(sqlite);
  return readMigrationFiles({ migrationsFolder }).filter(
    (migration) => lastApplied === undefined || BigInt(migration.folderMillis) > lastApplied,
  ).length;
}

function lastAppliedMigrationMillis(sqlite: SqliteConnection): bigint | undefined {
  if (!hasMigrationsTable(sqlite)) {
    return undefined;
  }
  const row = sqlite
    .prepare(`SELECT created_at FROM ${MIGRATIONS_TABLE} ORDER BY created_at DESC LIMIT 1`)
    .get() as { created_at: bigint | number } | undefined;
  return row === undefined ? undefined : BigInt(row.created_at);
}

function hasMigrationsTable(sqlite: SqliteConnection): boolean {
  const row = sqlite
    .prepare("SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = ?")
    .get(MIGRATIONS_TABLE);
  return row !== undefined;
}

function isEmptyDatabase(sqlite: SqliteConnection): boolean {
  const row = sqlite.prepare("SELECT count(*) AS total FROM sqlite_schema").get() as {
    total: bigint;
  };
  return row.total === 0n;
}
