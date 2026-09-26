import { describe, expect, it } from "vitest";
import { DomainError } from "../domain-error.ts";
import {
  addMoney,
  allocateMoney,
  createMoney,
  formatMoney,
  moneyFromDecimal,
  subtractMoney,
  sumMoney,
} from "./money.ts";

describe("moneyFromDecimal", () => {
  it("stores amounts as integer minor units", () => {
    expect(moneyFromDecimal("10.50", "EUR")).toEqual({ amountMinor: 1050n, currency: "EUR" });
    expect(moneyFromDecimal("10.5", "BRL")).toEqual({ amountMinor: 1050n, currency: "BRL" });
    expect(moneyFromDecimal("1000", "BRL")).toEqual({ amountMinor: 100000n, currency: "BRL" });
  });

  it("rejects more decimal places than the currency supports", () => {
    expect(() => moneyFromDecimal("10.505", "EUR")).toThrow(DomainError);
  });
});

describe("arithmetic", () => {
  it("adds and subtracts amounts in the same currency", () => {
    const tenEuros = moneyFromDecimal("10.00", "EUR");
    const threeEuros = moneyFromDecimal("3.00", "EUR");

    expect(addMoney(tenEuros, threeEuros)).toEqual(moneyFromDecimal("13.00", "EUR"));
    expect(subtractMoney(threeEuros, tenEuros)).toEqual(moneyFromDecimal("-7.00", "EUR"));
  });

  it("never combines different currencies", () => {
    expect(() => addMoney(moneyFromDecimal("1", "EUR"), moneyFromDecimal("1", "BRL"))).toThrowError(
      expect.objectContaining({ code: "CURRENCY_MISMATCH" }),
    );
  });

  it("sums a list, starting from zero", () => {
    expect(sumMoney([], "EUR")).toEqual(createMoney(0n, "EUR"));
    expect(
      sumMoney([moneyFromDecimal("0.10", "EUR"), moneyFromDecimal("0.20", "EUR")], "EUR"),
    ).toEqual(moneyFromDecimal("0.30", "EUR"));
  });
});

describe("allocateMoney", () => {
  it("splits €1,000 into 3 parts with the remainder on the last part", () => {
    const parts = allocateMoney(moneyFromDecimal("1000.00", "EUR"), 3);

    expect(parts.map(formatMoney)).toEqual(["EUR 333.33", "EUR 333.33", "EUR 333.34"]);
  });

  it("always adds up exactly to the total", () => {
    const total = moneyFromDecimal("100.00", "EUR");
    const parts = allocateMoney(total, 7);

    expect(sumMoney(parts, "EUR")).toEqual(total);
    expect(parts.map(formatMoney)).toEqual([
      "EUR 14.28",
      "EUR 14.28",
      "EUR 14.28",
      "EUR 14.29",
      "EUR 14.29",
      "EUR 14.29",
      "EUR 14.29",
    ]);
  });

  it("allocates negative amounts symmetrically", () => {
    const parts = allocateMoney(moneyFromDecimal("-1000.00", "EUR"), 3);

    expect(parts.map(formatMoney)).toEqual(["EUR -333.33", "EUR -333.33", "EUR -333.34"]);
  });

  it("rejects a non-positive or fractional number of parts", () => {
    const total = moneyFromDecimal("10", "EUR");

    expect(() => allocateMoney(total, 0)).toThrow(DomainError);
    expect(() => allocateMoney(total, 1.5)).toThrow(DomainError);
  });
});
