import { DomainError } from "../domain-error.ts";

export type CategoryNature = "INCOME" | "EXPENSE";

/** Classifies income and expenses (Salary, Food, Fees…). Categories are currency-agnostic. */
export type Category = Readonly<{
  id: string;
  name: string;
  nature: CategoryNature;
  parentId?: string;
}>;

export function createCategory(input: Category): Category {
  const id = input.id.trim();
  const name = input.name.trim();

  if (id === "" || name === "") {
    throw new DomainError("INVALID_CATEGORY", "A category needs a non-empty id and name.");
  }
  if (input.parentId === id) {
    throw new DomainError("INVALID_CATEGORY", "A category cannot be its own parent.");
  }

  return { ...input, id, name };
}

/**
 * Validates a whole category tree, as it would be after a change (BR-70, BR-71):
 * - every parent is in the set;
 * - a child has the same nature as its parent (BR-70);
 * - a parent is a top-level category, so the tree has at most two levels. A
 *   category with children therefore cannot become a child, and neither
 *   self-parenting nor cycles are possible (BR-71).
 */
export function assertValidCategoryHierarchy(categories: readonly Category[]): void {
  const byId = new Map(categories.map((category) => [category.id, category]));

  for (const category of categories) {
    if (category.parentId === undefined) {
      continue;
    }
    const parent = byId.get(category.parentId);
    if (parent === undefined) {
      throw new DomainError(
        "INVALID_CATEGORY",
        `Category "${category.name}" has an unknown parent "${category.parentId}".`,
      );
    }
    if (parent.nature !== category.nature) {
      throw new DomainError(
        "INVALID_CATEGORY",
        `Category "${category.name}" (${category.nature}) cannot be a child of "${parent.name}" (${parent.nature}).`,
      );
    }
    if (parent.parentId !== undefined) {
      throw new DomainError(
        "INVALID_CATEGORY",
        `Category "${category.name}" cannot be a child of "${parent.name}", which is itself a child: categories have at most two levels.`,
      );
    }
  }
}
