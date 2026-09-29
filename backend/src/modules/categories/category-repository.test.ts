import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../../infrastructure/database/test-fixtures.ts";
import { type CategoryRecord, createCategoryRepository } from "./category-repository.ts";

function record(
  id: string,
  overrides: Partial<CategoryRecord> & { parentId?: string } = {},
): CategoryRecord {
  const { parentId, ...rest } = overrides;
  return {
    category: {
      id,
      name: `Demo ${id}`,
      nature: "EXPENSE",
      ...(parentId === undefined ? {} : { parentId }),
    },
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

describe("category repository", () => {
  it("round-trips a top-level category and a child", () => {
    const repository = createCategoryRepository(database.db);
    const parent = record("food");
    const child = record("groceries", { parentId: "food" });

    repository.insert(parent);
    repository.insert(child);

    expect(repository.findById("food")).toEqual(parent);
    expect(repository.findById("groceries")).toEqual(child);
    expect(repository.findById("missing")).toBeUndefined();
  });

  it("lists active categories by creation, and archived ones only when asked", () => {
    const repository = createCategoryRepository(database.db);
    repository.insert(record("b", { createdAt: "2026-09-02T10:00:00.000Z" }));
    repository.insert(record("a", { createdAt: "2026-09-03T10:00:00.000Z" }));
    repository.insert(record("c", { archivedAt: "2026-09-04T10:00:00.000Z" }));

    const ids = (includeArchived: boolean) =>
      repository.list({ includeArchived }).map(({ category }) => category.id);

    expect(ids(false)).toEqual(["b", "a"]);
    expect(ids(true)).toEqual(["c", "b", "a"]);
  });

  it("updates the mutable fields and never nature or createdAt", () => {
    const repository = createCategoryRepository(database.db);
    repository.insert(record("food"));
    const original = record("groceries");
    repository.insert(original);

    repository.update({
      category: { id: "groceries", name: "Renamed", nature: "INCOME", parentId: "food" },
      archivedAt: "2026-09-05T10:00:00.000Z",
      createdAt: "2030-01-01T00:00:00.000Z",
      updatedAt: "2026-09-05T10:00:00.000Z",
    });

    expect(repository.findById("groceries")).toEqual({
      category: { id: "groceries", name: "Renamed", nature: "EXPENSE", parentId: "food" },
      archivedAt: "2026-09-05T10:00:00.000Z",
      createdAt: original.createdAt,
      updatedAt: "2026-09-05T10:00:00.000Z",
    });
  });

  it("deletes a category", () => {
    const repository = createCategoryRepository(database.db);
    repository.insert(record("food"));

    repository.delete("food");

    expect(repository.findById("food")).toBeUndefined();
  });

  it("is protected by the database: a parent with a child cannot be deleted", () => {
    const repository = createCategoryRepository(database.db);
    repository.insert(record("food"));
    repository.insert(record("groceries", { parentId: "food" }));

    expect(() => repository.delete("food")).toThrowError(/FOREIGN KEY constraint failed/);
    expect(repository.findById("food")).toBeDefined();
  });

  it("is protected by the database: a parent must exist", () => {
    const repository = createCategoryRepository(database.db);

    expect(() => repository.insert(record("groceries", { parentId: "missing" }))).toThrowError(
      /FOREIGN KEY constraint failed/,
    );
  });
});
