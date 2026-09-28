import { mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import type { SqliteConnection } from "./client.ts";

export class BackupVerificationError extends Error {
  constructor(reason: string) {
    super(`Backup verification failed: ${reason}`);
    this.name = "BackupVerificationError";
  }
}

/**
 * Writes a consistent copy of the open database into `backupDir` and verifies it.
 * `VACUUM INTO` produces a transactionally consistent snapshot (including pages
 * still in the WAL) and refuses to overwrite an existing file.
 * Returns the path of the verified backup.
 */
export function backupDatabase(
  sqlite: SqliteConnection,
  backupDir: string,
  reason: string,
  now: Date = new Date(),
): string {
  mkdirSync(backupDir, { recursive: true });
  const timestamp = now.toISOString().replaceAll(":", "-").replace(".", "-");
  const backupPath = join(backupDir, `solvia-${timestamp}-${reason}.db`);

  sqlite.prepare("VACUUM INTO ?").run(backupPath);
  verifyBackup(sqlite, backupPath);

  return backupPath;
}

function verifyBackup(source: SqliteConnection, backupPath: string): void {
  const backup = new Database(backupPath, { readonly: true, fileMustExist: true });
  backup.defaultSafeIntegers(true);

  try {
    const integrity = backup.pragma("integrity_check", { simple: true });
    if (integrity !== "ok") {
      throw new BackupVerificationError(`integrity check returned "${String(integrity)}".`);
    }
    if (describeContents(backup) !== describeContents(source)) {
      throw new BackupVerificationError("the backup does not match the source database.");
    }
  } finally {
    backup.close();
  }
}

/** Every schema object plus the row count of every table, as one comparable string. */
function describeContents(sqlite: SqliteConnection): string {
  const objects = sqlite
    .prepare("SELECT type, name, sql FROM sqlite_schema ORDER BY type, name")
    .all() as { type: string; name: string; sql: string | null }[];

  return objects
    .map(({ type, name, sql }) => {
      if (type !== "table") {
        return `${type} ${name}: ${sql}`;
      }
      const escapedName = name.replaceAll('"', '""');
      const { total } = sqlite.prepare(`SELECT count(*) AS total FROM "${escapedName}"`).get() as {
        total: bigint;
      };
      return `table ${name} (${total} rows): ${sql}`;
    })
    .join("\n");
}
