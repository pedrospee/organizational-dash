import { describe, expect, it } from "vitest";
import {
  createAccountRequestSchema,
  listAccountsQuerySchema,
  updateAccountRequestSchema,
} from "./account.ts";

const limit = { amountMinor: "50000", currency: "EUR" };

describe("createAccountRequestSchema", () => {
  it("accepts an account with or without institution and overdraft limit", () => {
    const minimal = { name: "Demo", kind: "BANK", currency: "EUR" };

    expect(createAccountRequestSchema.safeParse(minimal).success).toBe(true);
    expect(
      createAccountRequestSchema.safeParse({
        ...minimal,
        institution: "Example Bank",
        overdraftLimit: limit,
      }).success,
    ).toBe(true);
  });

  it("rejects unknown kinds, currencies and fields", () => {
    const valid = { name: "Demo", kind: "BANK", currency: "EUR" };

    expect(createAccountRequestSchema.safeParse({ ...valid, kind: "SAVINGS" }).success).toBe(false);
    expect(createAccountRequestSchema.safeParse({ ...valid, currency: "USD" }).success).toBe(false);
    expect(createAccountRequestSchema.safeParse({ ...valid, balance: limit }).success).toBe(false);
  });

  it("leaves financial rules to the core: a limit on a CASH account is a valid representation", () => {
    const cash = { name: "Demo", kind: "CASH", currency: "EUR", overdraftLimit: limit };

    expect(createAccountRequestSchema.safeParse(cash).success).toBe(true);
  });
});

describe("updateAccountRequestSchema", () => {
  it("accepts partial changes and null to remove optional fields", () => {
    expect(updateAccountRequestSchema.safeParse({ name: "Renamed" }).success).toBe(true);
    expect(
      updateAccountRequestSchema.safeParse({ institution: null, overdraftLimit: null }).success,
    ).toBe(true);
  });

  it("rejects kind and currency explicitly, since they are immutable", () => {
    for (const change of [{ kind: "CASH" }, { currency: "BRL" }]) {
      const result = updateAccountRequestSchema.safeParse(change);

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.code).toBe("unrecognized_keys");
    }
  });
});

describe("listAccountsQuerySchema", () => {
  it("reads includeArchived as a boolean, false by default", () => {
    expect(listAccountsQuerySchema.parse({})).toEqual({ includeArchived: false });
    expect(listAccountsQuerySchema.parse({ includeArchived: "true" })).toEqual({
      includeArchived: true,
    });
    expect(listAccountsQuerySchema.safeParse({ includeArchived: "yes" }).success).toBe(false);
  });
});
