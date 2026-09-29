import { randomUUID } from "node:crypto";
import { assertValidCategoryHierarchy, type Category, createCategory } from "@solvia/core";
import { ConflictError, NotFoundError } from "../errors.ts";
import type { CategoryRecord, CategoryRepository } from "./category-repository.ts";

export type NewCategory = Omit<Category, "id">;

/** A field left out stays unchanged; `parentId: null` moves the category to the top level. */
export type CategoryChanges = Readonly<{ name?: string; parentId?: string | null }>;

export type CategoryService = ReturnType<typeof createCategoryService>;

/**
 * Category use cases. Every write validates the resulting tree with the core
 * (BR-70, BR-71). The lifecycle rules live here: a parent must exist and be
 * active, archiving never leaves an active child under an archived parent, and
 * nothing is deleted in cascade.
 */
export function createCategoryService(
  repository: CategoryRepository,
  options: { now?: () => Date; newId?: () => string } = {},
) {
  const now = () => (options.now ?? (() => new Date()))().toISOString();
  const newId = options.newId ?? randomUUID;

  function load(id: string): CategoryRecord {
    const record = repository.findById(id);
    if (record === undefined) {
      throw new NotFoundError("CATEGORY_NOT_FOUND", `No category with id "${id}".`);
    }
    return record;
  }

  /** A new parent must exist and must not be archived. */
  function assertUsableParent(parentId: string | undefined): void {
    if (parentId !== undefined && load(parentId).archivedAt !== null) {
      throw new ConflictError(
        "CATEGORY_PARENT_ARCHIVED",
        `The parent category "${parentId}" is archived.`,
      );
    }
  }

  /** Validates the whole tree as it would be with `category` written (BR-70, BR-71). */
  function assertValidTreeWith(category: Category): void {
    const others = repository
      .list({ includeArchived: true })
      .map((record) => record.category)
      .filter(({ id }) => id !== category.id);
    assertValidCategoryHierarchy([...others, category]);
  }

  function children(id: string): CategoryRecord[] {
    return repository
      .list({ includeArchived: true })
      .filter(({ category }) => category.parentId === id);
  }

  function save(current: CategoryRecord, changes: Partial<CategoryRecord>): CategoryRecord {
    const record = { ...current, ...changes, updatedAt: now() };
    repository.update(record);
    return record;
  }

  return {
    list(options: { includeArchived: boolean }): CategoryRecord[] {
      return repository.list(options);
    },

    get: load,

    create(input: NewCategory): CategoryRecord {
      const category = createCategory({ ...input, id: newId() });
      assertUsableParent(category.parentId);
      assertValidTreeWith(category);
      const timestamp = now();
      const record = { category, archivedAt: null, createdAt: timestamp, updatedAt: timestamp };
      repository.insert(record);
      return record;
    },

    /** An update that changes nothing is a no-op: updatedAt marks the last effective change. */
    update(id: string, changes: CategoryChanges): CategoryRecord {
      const current = load(id);
      const category = createCategory(applyChanges(current.category, changes));
      if (sameEditableFields(category, current.category)) {
        return current;
      }
      if (category.parentId !== current.category.parentId) {
        assertUsableParent(category.parentId);
      }
      assertValidTreeWith(category);
      return save(current, { category });
    },

    /** Archiving an archived category changes nothing. */
    archive(id: string): CategoryRecord {
      const current = load(id);
      if (current.archivedAt !== null) {
        return current;
      }
      if (children(id).some(({ archivedAt }) => archivedAt === null)) {
        throw new ConflictError(
          "CATEGORY_HAS_ACTIVE_CHILDREN",
          "Archive the child categories before their parent.",
        );
      }
      return save(current, { archivedAt: now() });
    },

    unarchive(id: string): CategoryRecord {
      const current = load(id);
      if (current.archivedAt === null) {
        return current;
      }
      assertUsableParent(current.category.parentId);
      return save(current, { archivedAt: null });
    },

    /**
     * Deletes a category nothing depends on. Children take precedence over postings
     * (CATEGORY_IN_USE, checked once postings are persisted).
     */
    delete(id: string): void {
      load(id);
      if (children(id).length > 0) {
        throw new ConflictError(
          "CATEGORY_HAS_CHILDREN",
          "A category with child categories cannot be deleted.",
        );
      }
      repository.delete(id);
    },
  };
}

function sameEditableFields(left: Category, right: Category): boolean {
  return left.name === right.name && left.parentId === right.parentId;
}

function applyChanges(category: Category, changes: CategoryChanges): Category {
  const { parentId, ...fixed } = category;
  const nextParentId = changes.parentId === undefined ? parentId : (changes.parentId ?? undefined);

  return {
    ...fixed,
    ...(changes.name === undefined ? {} : { name: changes.name }),
    ...(nextParentId === undefined ? {} : { parentId: nextParentId }),
  };
}
