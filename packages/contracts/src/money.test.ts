import { describe, expect, it } from "vitest";
import { moneySchema } from "./money.ts";

const eur = (amountMinor: string) => ({ amountMinor, currency: "EUR" });

describe("moneySchema", () => {
  it("accepts integer minor units as strings, of any sign", () => {
    for (const amountMinor of ["0", "1050", "-1050"]) {
      expect(moneySchema.safeParse(eur(amountMinor)).success).toBe(true);
    }
  });

  it("accepts amounts above Number.MAX_SAFE_INTEGER up to the 64-bit limit", () => {
    expect(moneySchema.safeParse(eur("9007199254740993")).success).toBe(true);
    expect(moneySchema.safeParse(eur("9223372036854775807")).success).toBe(true);
    expect(moneySchema.safeParse(eur("-9223372036854775808")).success).toBe(true);
  });

  it("rejects amounts that SQLite cannot store", () => {
    expect(moneySchema.safeParse(eur("9223372036854775808")).success).toBe(false);
    expect(moneySchema.safeParse(eur("-9223372036854775809")).success).toBe(false);
  });

  it("rejects numbers, decimals and malformed strings", () => {
    for (const amountMinor of [1050, "10.50", "1e3", "", " 1050", "01050", "+1050"]) {
      expect(moneySchema.safeParse({ amountMinor, currency: "EUR" }).success).toBe(false);
    }
  });

  it("rejects unknown currencies and extra fields", () => {
    expect(moneySchema.safeParse({ amountMinor: "1050", currency: "USD" }).success).toBe(false);
    expect(moneySchema.safeParse({ ...eur("1050"), note: "extra" }).success).toBe(false);
  });
});
