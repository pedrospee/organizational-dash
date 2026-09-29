import type { CategoryResponse } from "@solvia/contracts";
import type { CategoryRecord } from "../../modules/categories/category-repository.ts";

// Category requests already have the core's shape (no money, no bigint), so routes
// pass them to the service as they are; only the response needs mapping.

export function categoryToJson({
  category,
  archivedAt,
  createdAt,
  updatedAt,
}: CategoryRecord): CategoryResponse {
  return {
    id: category.id,
    name: category.name,
    nature: category.nature,
    parentId: category.parentId ?? null,
    archivedAt,
    createdAt,
    updatedAt,
  };
}
