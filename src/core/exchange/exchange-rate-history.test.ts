import { describe, expect, it } from "vitest";
import { parseLocalDate } from "../local-date.ts";
import { formatMoney, moneyFromDecimal } from "../money/money.ts";
import { createExchangeRate, type ExchangeRate } from "./exchange-rate.ts";
import { convertMoneyOnDate, findApplicableRate } from "./exchange-rate-history.ts";

function manualRate(effectiveDate: string, rate: string, recordedAt: string): ExchangeRate {
  return createExchangeRate({
    baseCurrency: "EUR",
    quoteCurrency: "BRL",
    rate,
    effectiveDate: parseLocalDate(effectiveDate),
    source: "MANUAL",
    recordedAt,
  });
}

const rates = [
  manualRate("2026-06-01", "6.00", "2026-06-01T08:00:00Z"),
  manualRate("2026-09-01", "7.00", "2026-09-01T08:00:00Z"),
  manualRate("2026-09-01", "7.10", "2026-09-01T18:00:00Z"),
];

describe("findApplicableRate", () => {
  it("uses the historical rate for a past date", () => {
    const rate = findApplicableRate(rates, "EUR", "BRL", parseLocalDate("2026-07-15"));

    expect(rate?.rate).toBe("6.00");
  });

  it("uses the latest rate for the current date, preferring the last one recorded that day", () => {
    const rate = findApplicableRate(rates, "EUR", "BRL", parseLocalDate("2026-09-26"));

    expect(rate?.rate).toBe("7.10");
  });

  it("finds a EUR/BRL rate when asked for BRL/EUR", () => {
    expect(findApplicableRate(rates, "BRL", "EUR", parseLocalDate("2026-07-15"))?.rate).toBe(
      "6.00",
    );
  });

  it("returns undefined before the first known rate", () => {
    expect(findApplicableRate(rates, "EUR", "BRL", parseLocalDate("2026-01-01"))).toBeUndefined();
  });
});

describe("convertMoneyOnDate", () => {
  const brlBalance = moneyFromDecimal("10000.00", "BRL");

  it("gives a different EUR value for the same BRL amount as the rate moves (FX effect)", () => {
    const inJuly = convertMoneyOnDate(brlBalance, "EUR", rates, parseLocalDate("2026-07-15"));
    const today = convertMoneyOnDate(brlBalance, "EUR", rates, parseLocalDate("2026-09-26"));

    expect(formatMoney(inJuly)).toBe("EUR 1666.67");
    expect(formatMoney(today)).toBe("EUR 1408.45");
    expect(brlBalance).toEqual(moneyFromDecimal("10000.00", "BRL"));
  });

  it("returns same-currency amounts unchanged", () => {
    const euros = moneyFromDecimal("50.00", "EUR");

    expect(convertMoneyOnDate(euros, "EUR", [], parseLocalDate("2026-09-26"))).toBe(euros);
  });

  it("fails clearly when no rate is available", () => {
    expect(() =>
      convertMoneyOnDate(brlBalance, "EUR", rates, parseLocalDate("2026-01-01")),
    ).toThrowError(expect.objectContaining({ code: "EXCHANGE_RATE_NOT_FOUND" }));
  });
});
