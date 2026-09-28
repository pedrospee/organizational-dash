import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openSqlite, type SqliteConnection } from "./client.ts";
import {
  assertNoPendingMigrations,
  countPendingMigrations,
  MIGRATIONS_FOLDER,
  migrateDatabase,
  PendingMigrationsError,
} from "./migrations.ts";

// Fictitious migrations, written the way drizzle-kit writes them.
const FIRST = {
  tag: "0000_first",
  when: 1_000,
  sql: "CREATE TABLE `notes` (`id` text PRIMARY KEY);",
};
const SECOND = { tag: "0001_second", when: 2_000, sql: "ALTER TABLE `notes` ADD `body` text;" };

let workDir: string;
let backupDir: string;
const openConnections: SqliteConnection[] = [];

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "solvia-migrations-"));
  backupDir = join(workDir, "backups");
});

afterEach(() => {
  for (const sqlite of openConnections.splice(0)) {
    sqlite.close();
  }
  rmSync(workDir, { recursive: true, force: true });
});

function writeMigrations(migrations: (typeof FIRST)[]): string {
  const folder = join(workDir, `migrations-${migrations.length}`);
  mkdirSync(join(folder, "meta"), { recursive: true });
  const entries = migrations.map(({ tag, when }, idx) => ({
    idx,
    version: "6",
    when,
    tag,
    breakpoints: true,
  }));
  writeFileSync(
    join(folder, "meta", "_journal.json"),
    JSON.stringify({ version: "7", dialect: "sqlite", entries }),
  );
  for (const { tag, sql } of migrations) {
    writeFileSync(join(folder, `${tag}.sql`), sql);
  }
  return folder;
}

function openFileDatabase(): SqliteConnection {
  const sqlite = openSqlite(join(workDir, "solvia.db"));
  openConnections.push(sqlite);
  return sqlite;
}

function backupFiles(): string[] {
  try {
    return readdirSync(backupDir);
  } catch {
    return [];
  }
}

describe("committed migrations", () => {
  it("apply successfully to an empty in-memory database", () => {
    const sqlite = openSqlite(":memory:");
    openConnections.push(sqlite);

    migrateDatabase(sqlite, { backupDir });

    expect(countPendingMigrations(sqlite, MIGRATIONS_FOLDER)).toBe(0);
    expect(backupFiles()).toEqual([]);
  });
});

describe("migrateDatabase", () => {
  it("migrates a new database without creating a backup", () => {
    const sqlite = openFileDatabase();
    const folder = writeMigrations([FIRST]);

    const result = migrateDatabase(sqlite, { backupDir, migrationsFolder: folder });

    expect(result).toEqual({ status: "migrated", applied: 1 });
    expect(backupFiles()).toEqual([]);
  });

  it("does nothing, and creates no backup, when no migration is pending", () => {
    const sqlite = openFileDatabase();
    const folder = writeMigrations([FIRST]);
    migrateDatabase(sqlite, { backupDir, migrationsFolder: folder });

    const result = migrateDatabase(sqlite, { backupDir, migrationsFolder: folder });

    expect(result).toEqual({ status: "up-to-date" });
    expect(backupFiles()).toEqual([]);
  });

  it("backs up an existing database before applying pending migrations", () => {
    const sqlite = openFileDatabase();
    migrateDatabase(sqlite, { backupDir, migrationsFolder: writeMigrations([FIRST]) });
    sqlite.prepare("INSERT INTO notes (id) VALUES ('fictitious-note')").run();

    const result = migrateDatabase(sqlite, {
      backupDir,
      migrationsFolder: writeMigrations([FIRST, SECOND]),
    });

    expect(result.status).toBe("migrated");
    expect(result).toMatchObject({ applied: 1 });
    expect(backupFiles()).toHaveLength(1);

    // The backup holds the data and the schema from before the migration.
    const backup = openSqlite(join(backupDir, backupFiles()[0] ?? ""), { readonly: true });
    openConnections.push(backup);
    const columns = backup.prepare("SELECT name FROM pragma_table_info('notes')").pluck().all();
    expect(columns).toEqual(["id"]);
    expect(backup.prepare("SELECT id FROM notes").pluck().all()).toEqual(["fictitious-note"]);
  });

  it("does not migrate when the backup cannot be written", () => {
    const sqlite = openFileDatabase();
    migrateDatabase(sqlite, { backupDir, migrationsFolder: writeMigrations([FIRST]) });
    writeFileSync(backupDir, "a file where the backup directory should be");

    expect(() =>
      migrateDatabase(sqlite, { backupDir, migrationsFolder: writeMigrations([FIRST, SECOND]) }),
    ).toThrow();

    const columns = sqlite.prepare("SELECT name FROM pragma_table_info('notes')").pluck().all();
    expect(columns).toEqual(["id"]);
  });
});

describe("assertNoPendingMigrations", () => {
  it("rejects a database with pending migrations and points to db:migrate", () => {
    const sqlite = openFileDatabase();
    const folder = writeMigrations([FIRST]);

    expect(() => assertNoPendingMigrations(sqlite, folder)).toThrow(PendingMigrationsError);
    expect(() => assertNoPendingMigrations(sqlite, folder)).toThrow(/npm run db:migrate/);
  });

  it("accepts a fully migrated database", () => {
    const sqlite = openFileDatabase();
    const folder = writeMigrations([FIRST]);
    migrateDatabase(sqlite, { backupDir, migrationsFolder: folder });

    expect(() => assertNoPendingMigrations(sqlite, folder)).not.toThrow();
  });
});
