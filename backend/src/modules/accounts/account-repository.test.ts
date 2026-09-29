import { createMoney } from "@solvia/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../../infrastructure/database/test-fixtures.ts";
import { type AccountRecord, createAccountRepository } from "./account-repository.ts";

const ABOVE_MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER) * 10n + 3n;

function record(overrides: Partial<AccountRecord> & { id: string }): AccountRecord {
  const { id, ...rest } = overrides;
  return {
    account: { id, name: `Demo ${id}`, kind: "BANK", currency: "EUR" },
    archivedAt: null,
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
    ...rest,
  };
}

let database: TestDatabase;

beforeEach(() => {
  database = createTestDatabase();
});

afterEach(() => {
  database.sqlite.close();
});

describe("account repository", () => {
  it("round-trips an account with institution and an overdraft limit above MAX_SAFE_INTEGER", () => {
    const repository = createAccountRepository(database.db);
    const saved = record({
      id: "a",
      account: {
        id: "a",
        name: "Demo Bank",
        institution: "Example Bank",
        kind: "BANK",
        currency: "EUR",
        overdraftLimit: createMoney(ABOVE_MAX_SAFE_INTEGER, "EUR"),
      },
    });

    repository.insert(saved);

    expect(repository.findById("a")).toEqual(saved);
    const stored = database.sqlite
      .prepare("SELECT typeof(overdraft_limit_minor) AS type FROM accounts")
      .get();
    expect(stored).toEqual({ type: "integer" });
  });

  it("leaves optional fields out of the core account when they are not stored", () => {
    const repository = createAccountRepository(database.db);
    repository.insert(record({ id: "a" }));

    expect(repository.findById("a")?.account).toEqual({
      id: "a",
      name: "Demo a",
      kind: "BANK",
      currency: "EUR",
    });
    expect(repository.findById("missing")).toBeUndefined();
  });

  it("lists active accounts by creation, and archived ones only when asked", () => {
    const repository = createAccountRepository(database.db);
    repository.insert(record({ id: "b", createdAt: "2026-09-02T10:00:00.000Z" }));
    repository.insert(record({ id: "a", createdAt: "2026-09-03T10:00:00.000Z" }));
    repository.insert(record({ id: "c", archivedAt: "2026-09-04T10:00:00.000Z" }));

    const ids = (includeArchived: boolean) =>
      repository.list({ includeArchived }).map(({ account }) => account.id);

    expect(ids(false)).toEqual(["b", "a"]);
    expect(ids(true)).toEqual(["c", "b", "a"]);
  });

  it("updates the mutable fields and never kind, currency or createdAt", () => {
    const repository = createAccountRepository(database.db);
    const original = record({ id: "a" });
    repository.insert(original);

    repository.update({
      account: { id: "a", name: "Renamed", kind: "CASH", currency: "BRL" },
      archivedAt: "2026-09-05T10:00:00.000Z",
      createdAt: "2030-01-01T00:00:00.000Z",
      updatedAt: "2026-09-05T10:00:00.000Z",
    });

    expect(repository.findById("a")).toEqual({
      account: { id: "a", name: "Renamed", kind: "BANK", currency: "EUR" },
      archivedAt: "2026-09-05T10:00:00.000Z",
      createdAt: original.createdAt,
      updatedAt: "2026-09-05T10:00:00.000Z",
    });
  });

  it("deletes an account", () => {
    const repository = createAccountRepository(database.db);
    repository.insert(record({ id: "a" }));

    repository.delete("a");

    expect(repository.findById("a")).toBeUndefined();
  });
});
