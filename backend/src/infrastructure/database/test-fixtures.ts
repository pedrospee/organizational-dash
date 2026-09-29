// Test helpers. Excluded from the build (tsconfig.build.json).
import { type AppDatabase, createDatabase, openSqlite, type SqliteConnection } from "./client.ts";
import { migrateDatabase } from "./migrations.ts";

export type TestDatabase = Readonly<{ sqlite: SqliteConnection; db: AppDatabase }>;

/** An in-memory database with every committed migration applied. */
export function createTestDatabase(): TestDatabase {
  const sqlite = openSqlite(":memory:");
  // A new, empty database is never backed up, so no backup directory is written.
  migrateDatabase(sqlite, { backupDir: "/nonexistent-test-backups" });
  return { sqlite, db: createDatabase(sqlite) };
}
