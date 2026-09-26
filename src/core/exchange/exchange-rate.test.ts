import { describe, expect, it } from "vitest";
import { DomainError } from "../domain-error.ts";
import { parseLocalDate } from "../local-date.ts";
import { formatMoney, moneyFromDecimal } from "../money/money.ts";
import {
  calculateExecutedRate,
  convertMoney,
  createExchangeRate,
  type ExchangeRate,
} from "./exchange-rate.ts";

const effectiveDate = parseLocalDate("2026-09-01");
const recordedAt = "2026-09-01T09:00:00Z";

function eurBrlRate(rate: string): ExchangeRate {
  return createExchangeRate({
    baseCurrency: "EUR",
    quoteCurrency: "BRL",
    rate,
    effectiveDate,
    source: "MANUAL",
    recordedAt,
  });
}

describe("createExchangeRate", () => {
  it("rejects a pair with the same currency", () => {
    expect(() =>
      createExchangeRate({
        baseCurrency: "EUR",
        quoteCurrency: "EUR",
        rate: "1",
        effectiveDate,
        source: "MANUAL",
        recordedAt,
      }),
    ).toThrow(DomainError);
  });

  it("rejects zero, negative or malformed rates", () => {
    for (const invalidRate of ["0", "-6.00", "6,00", "6.12345678901"]) {
      expect(() => eurBrlRate(invalidRate)).toThrow(DomainError);
    }
  });

  it("rejects a recordedAt that is not an ISO timestamp", () => {
    expect(() =>
      createExchangeRate({
        baseCurrency: "EUR",
        quoteCurrency: "BRL",
        rate: "6",
        effectiveDate,
        source: "MANUAL",
        recordedAt: "yesterday",
      }),
    ).toThrow(DomainError);
  });
});

describe("convertMoney (EUR/BRL = 6.00 means 1 EUR = 6 BRL)", () => {
  it("converts BRL 1,000 to EUR 166.67 and keeps the original BRL amount intact", () => {
    const original = moneyFromDecimal("1000.00", "BRL");

    const converted = convertMoney(original, eurBrlRate("6.00"), "EUR");

    expect(formatMoney(converted)).toBe("EUR 166.67");
    expect(original).toEqual(moneyFromDecimal("1000.00", "BRL"));
  });

  it("converts from base to quote currency", () => {
    const converted = convertMoney(moneyFromDecimal("166.67", "EUR"), eurBrlRate("6.00"), "BRL");

    expect(formatMoney(converted)).toBe("BRL 1000.02");
  });

  it("rounds half away from zero at the minor unit", () => {
    // BRL 0.03 / 6 = EUR 0.005 → 0.01
    expect(formatMoney(convertMoney(moneyFromDecimal("0.03", "BRL"), eurBrlRate("6"), "EUR"))).toBe(
      "EUR 0.01",
    );
    expect(
      formatMoney(convertMoney(moneyFromDecimal("-0.03", "BRL"), eurBrlRate("6"), "EUR")),
    ).toBe("EUR -0.01");
  });

  it("uses every decimal place of the rate", () => {
    const converted = convertMoney(moneyFromDecimal("100.00", "EUR"), eurBrlRate("6.1234"), "BRL");

    expect(formatMoney(converted)).toBe("BRL 612.34");
  });

  it("rejects a conversion the rate does not cover", () => {
    expect(() => convertMoney(moneyFromDecimal("1", "EUR"), eurBrlRate("6"), "EUR")).toThrowError(
      expect.objectContaining({ code: "CURRENCY_MISMATCH" }),
    );
  });
});

describe("calculateExecutedRate", () => {
  it("derives the rate from the real legs, always as EUR/BRL", () => {
    const rate = calculateExecutedRate(
      moneyFromDecimal("600.00", "BRL"),
      moneyFromDecimal("100.00", "EUR"),
      { effectiveDate, recordedAt },
    );

    expect(rate).toMatchObject({
      baseCurrency: "EUR",
      quoteCurrency: "BRL",
      rate: "6.000000",
      source: "TRANSACTION",
    });
  });

  it("keeps six decimal places for non-round rates", () => {
    const rate = calculateExecutedRate(
      moneyFromDecimal("100.00", "EUR"),
      moneyFromDecimal("612.34", "BRL"),
      { effectiveDate, recordedAt },
    );

    expect(rate.rate).toBe("6.123400");
  });

  it("rejects non-positive legs", () => {
    expect(() =>
      calculateExecutedRate(moneyFromDecimal("0", "EUR"), moneyFromDecimal("6", "BRL"), {
        effectiveDate,
        recordedAt,
      }),
    ).toThrow(DomainError);
  });
});
