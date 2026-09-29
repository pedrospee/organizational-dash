import { z } from "zod";

// Kept explicit here instead of importing @solvia/core (ADR-0003); a backend type
// test fails if this list drifts from the core's CategoryNature.
export const categoryNatureSchema = z.enum(["INCOME", "EXPENSE"]);

export type CategoryNatureJson = z.infer<typeof categoryNatureSchema>;

// Only the representation is checked here. Hierarchy rules (BR-70, BR-71) belong
// to @solvia/core; whether a parent exists or is archived, to the backend.

/** POST /api/categories */
export const createCategoryRequestSchema = z.strictObject({
  name: z.string(),
  nature: categoryNatureSchema,
  parentId: z.string().optional(),
});

export type CreateCategoryRequest = z.infer<typeof createCategoryRequestSchema>;

/**
 * PATCH /api/categories/:id. A field left out stays unchanged; `parentId: null`
 * moves the category to the top level. `nature` is immutable: sending it is rejected.
 */
export const updateCategoryRequestSchema = z.strictObject({
  name: z.string().optional(),
  parentId: z.string().nullable().optional(),
});

export type UpdateCategoryRequest = z.infer<typeof updateCategoryRequestSchema>;

/** GET /api/categories. Archived categories are left out unless asked for. */
export const listCategoriesQuerySchema = z.strictObject({
  includeArchived: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

export const categoryResponseSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  nature: categoryNatureSchema,
  parentId: z.string().nullable(),
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type CategoryResponse = z.infer<typeof categoryResponseSchema>;

export const categoryListResponseSchema = z.strictObject({
  items: z.array(categoryResponseSchema),
});

export type CategoryListResponse = z.infer<typeof categoryListResponseSchema>;
