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
