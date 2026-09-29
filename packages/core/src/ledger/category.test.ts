import { describe, expect, it } from "vitest";
import { formatMoney } from "../money/money.ts";
import { summarizeIncomeAndExpense } from "./balances.ts";
import { assertValidCategoryHierarchy, type Category } from "./category.ts";
import { demoBankEur, demoDate, eur } from "./test-fixtures.ts";
import { createExpenseTransaction } from "./transaction-factories.ts";

// Fictitious categories (BR-05).
const food: Category = { id: "food", name: "Food", nature: "EXPENSE" };
const groceries: Category = {
  id: "groceries",
  name: "Groceries",
  nature: "EXPENSE",
  parentId: "food",
};
const restaurants: Category = {
  id: "restaurants",
  name: "Restaurants",
  nature: "EXPENSE",
  parentId: "food",
};
const housing: Category = { id: "housing", name: "Housing", nature: "EXPENSE" };
const salary: Category = { id: "salary", name: "Salary", nature: "INCOME" };

const invalidCategory = expect.objectContaining({ code: "INVALID_CATEGORY" });

describe("assertValidCategoryHierarchy", () => {
  it("accepts top-level categories and one level of children", () => {
    expect(() =>
      assertValidCategoryHierarchy([food, groceries, restaurants, housing, salary]),
    ).not.toThrow();
    expect(() => assertValidCategoryHierarchy([])).not.toThrow();
  });

  it("accepts a child listed before its parent: the tree is checked as a whole", () => {
    expect(() => assertValidCategoryHierarchy([groceries, food])).not.toThrow();
  });

  it("rejects a parent that is not in the set", () => {
    expect(() => assertValidCategoryHierarchy([groceries])).toThrowError(invalidCategory);
  });
});

describe("BR-70: a child has the same nature as its parent", () => {
  it("rejects an income child under an expense parent", () => {
    const bonus: Category = { id: "bonus", name: "Bonus", nature: "INCOME", parentId: "food" };

    expect(() => assertValidCategoryHierarchy([food, bonus])).toThrowError(invalidCategory);
  });

  it("rejects an expense child under an income parent", () => {
    const taxes: Category = { id: "taxes", name: "Taxes", nature: "EXPENSE", parentId: "salary" };

    expect(() => assertValidCategoryHierarchy([salary, taxes])).toThrowError(invalidCategory);
  });
});

describe("BR-71: at most two levels, parent → child", () => {
  it("rejects a third level", () => {
    const organic: Category = {
      id: "organic",
      name: "Organic",
      nature: "EXPENSE",
      parentId: "groceries",
    };

    expect(() => assertValidCategoryHierarchy([food, groceries, organic])).toThrowError(
      invalidCategory,
    );
  });

  it("rejects moving a category that has children under another parent", () => {
    const foodUnderHousing: Category = { ...food, parentId: "housing" };

    expect(() => assertValidCategoryHierarchy([housing, foodUnderHousing, groceries])).toThrowError(
      invalidCategory,
    );
  });

  it("accepts moving a category without children under another parent", () => {
    const groceriesUnderHousing: Category = { ...groceries, parentId: "housing" };

    expect(() =>
      assertValidCategoryHierarchy([food, housing, groceriesUnderHousing, restaurants]),
    ).not.toThrow();
  });

  it("rejects a category that is its own parent", () => {
    expect(() => assertValidCategoryHierarchy([{ ...food, parentId: "food" }])).toThrowError(
      invalidCategory,
    );
  });

  it("rejects a cycle between two categories", () => {
    expect(() =>
      assertValidCategoryHierarchy([
        { ...food, parentId: "housing" },
        { ...housing, parentId: "food" },
      ]),
    ).toThrowError(invalidCategory);
  });

  it("names the offending category in the message", () => {
    const organic: Category = {
      id: "organic",
      name: "Organic",
      nature: "EXPENSE",
      parentId: "groceries",
    };

    expect(() => assertValidCategoryHierarchy([food, groceries, organic])).toThrowError(/Organic/);
  });
});

describe("a hierarchy never counts a posting twice", () => {
  it("sums postings on a parent and on its child once each", () => {
    const expense = (id: string, category: Category, amount: string) =>
      createExpenseTransaction({
        id,
        date: demoDate,
        description: "Fictitious expense",
        paidFrom: demoBankEur,
        category,
        amount: eur(amount),
      });
    const ledger = [expense("t-food", food, "10.00"), expense("t-groceries", groceries, "25.00")];

    const { expense: total } = summarizeIncomeAndExpense(ledger, [food, groceries], "EUR");

    expect(formatMoney(total)).toBe("EUR 35.00");
  });
});
