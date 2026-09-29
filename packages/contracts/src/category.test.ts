import { describe, expect, it } from "vitest";
import {
  createCategoryRequestSchema,
  listCategoriesQuerySchema,
  updateCategoryRequestSchema,
} from "./category.ts";

describe("createCategoryRequestSchema", () => {
  it("accepts a top-level or a child category", () => {
    expect(createCategoryRequestSchema.safeParse({ name: "Food", nature: "EXPENSE" }).success).toBe(
      true,
    );
    expect(
      createCategoryRequestSchema.safeParse({ name: "Groceries", nature: "EXPENSE", parentId: "p" })
        .success,
    ).toBe(true);
  });

  it("rejects unknown natures and fields", () => {
    expect(createCategoryRequestSchema.safeParse({ name: "X", nature: "SAVING" }).success).toBe(
      false,
    );
    expect(
      createCategoryRequestSchema.safeParse({ name: "X", nature: "EXPENSE", color: "red" }).success,
    ).toBe(false);
  });

  it("leaves hierarchy rules to the core: any parent id is a valid representation", () => {
    const child = { name: "Bonus", nature: "INCOME", parentId: "an-expense-category" };

    expect(createCategoryRequestSchema.safeParse(child).success).toBe(true);
  });
});

describe("updateCategoryRequestSchema", () => {
  it("accepts a new name, a new parent, or null to move to the top level", () => {
    for (const change of [{ name: "Renamed" }, { parentId: "p" }, { parentId: null }, {}]) {
      expect(updateCategoryRequestSchema.safeParse(change).success).toBe(true);
    }
  });

  it("rejects nature explicitly, since it is immutable", () => {
    const result = updateCategoryRequestSchema.safeParse({ nature: "INCOME" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.code).toBe("unrecognized_keys");
  });
});

describe("listCategoriesQuerySchema", () => {
  it("reads includeArchived as a boolean, false by default", () => {
    expect(listCategoriesQuerySchema.parse({})).toEqual({ includeArchived: false });
    expect(listCategoriesQuerySchema.parse({ includeArchived: "true" })).toEqual({
      includeArchived: true,
    });
  });
});
