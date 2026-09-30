import { describe, expect, it } from "vitest";
import { parseDecimal } from "../decimal.ts";
import { DomainError } from "../domain-error.ts";
import { parseLocalDate } from "../local-date.ts";
import { formatMoney, moneyFromDecimal } from "../money/money.ts";
import {
  calculateExecutedRate,
  convertMoney,
  createExchangeRate,
  createManualExchangeRate,
  type ExchangeRate,
  invertExchangeRate,
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

  it("keeps the rate in canonical form: one value, one spelling (BR-83)", () => {
    const spellings: [string, string][] = [
      ["6.20", "6.2"],
      ["06.20", "6.2"],
      ["6.000", "6"],
      ["6", "6"],
      ["0.50", "0.5"],
      ["6.1234567891", "6.1234567891"],
      // 11 digits written, but the value has 1 decimal place: the value is what counts.
      ["6.20000000000", "6.2"],
    ];

    for (const [written, canonical] of spellings) {
      expect(eurBrlRate(written).rate).toBe(canonical);
    }
  });

  it("allows at most ten decimal places of value (BR-83)", () => {
    expect(eurBrlRate("0.0000000001").rate).toBe("0.0000000001");
    expect(() => eurBrlRate("0.00000000001")).toThrowError(
      expect.objectContaining({ code: "INVALID_EXCHANGE_RATE" }),
    );
  });

  it("rejects zero in any spelling", () => {
    for (const zero of ["0", "0.0", "00.0000000000", "-0"]) {
      expect(() => eurBrlRate(zero)).toThrowError(
        expect.objectContaining({ code: "INVALID_EXCHANGE_RATE" }),
      );
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
      rate: "6",
      source: "TRANSACTION",
    });
  });

  it("rounds to six decimal places and keeps the canonical spelling (BR-83)", () => {
    const exact = calculateExecutedRate(
      moneyFromDecimal("100.00", "EUR"),
      moneyFromDecimal("612.34", "BRL"),
      { effectiveDate, recordedAt },
    );
    // R$120 charged as €20.40: 5.88235294… → 5.882353
    const rounded = calculateExecutedRate(
      moneyFromDecimal("20.40", "EUR"),
      moneyFromDecimal("120.00", "BRL"),
      { effectiveDate, recordedAt },
    );

    expect(exact.rate).toBe("6.1234");
    expect(rounded.rate).toBe("5.882353");
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

const invalidRate = expect.objectContaining({ code: "INVALID_EXCHANGE_RATE" });

describe("createManualExchangeRate (BR-80)", () => {
  const manual = (baseCurrency: "EUR" | "BRL", quoteCurrency: "EUR" | "BRL", rate = "6.20") =>
    createManualExchangeRate({ baseCurrency, quoteCurrency, rate, effectiveDate, recordedAt });

  it("records EUR/BRL as a MANUAL rate in canonical form", () => {
    expect(manual("EUR", "BRL")).toEqual({
      baseCurrency: "EUR",
      quoteCurrency: "BRL",
      rate: "6.2",
      effectiveDate,
      source: "MANUAL",
      recordedAt,
    });
  });

  it("rejects BRL/EUR: the other direction is derived, never recorded", () => {
    expect(() => manual("BRL", "EUR", "0.16")).toThrowError(invalidRate);
  });

  it("rejects a pair with the same currency", () => {
    expect(() => manual("EUR", "EUR", "1")).toThrowError(invalidRate);
  });

  it("rejects a rate whose inverse would round to zero", () => {
    // 1 / 10,000,000,000 = 0.0000000001, the smallest rate there is.
    expect(manual("EUR", "BRL", "10000000000").rate).toBe("10000000000");
    expect(() => manual("EUR", "BRL", "100000000000")).toThrowError(invalidRate);
  });
});

describe("invertExchangeRate (BR-82)", () => {
  it("derives BRL/EUR from EUR/BRL, keeping the date, source and recording time", () => {
    expect(invertExchangeRate(eurBrlRate("6.20"))).toEqual({
      baseCurrency: "BRL",
      quoteCurrency: "EUR",
      rate: "0.1612903226",
      effectiveDate,
      source: "MANUAL",
      recordedAt,
    });
  });

  it("is exact when the inverse fits in ten decimal places", () => {
    expect(invertExchangeRate(eurBrlRate("2")).rate).toBe("0.5");
    expect(invertExchangeRate(eurBrlRate("0.5")).rate).toBe("2");
    expect(invertExchangeRate(eurBrlRate("4")).rate).toBe("0.25");
    expect(invertExchangeRate(invertExchangeRate(eurBrlRate("4")))).toEqual(eurBrlRate("4"));
  });

  it("rounds half away from zero at the tenth decimal place", () => {
    // 1 / 6 = 0.16666666666… → 0.1666666667
    expect(invertExchangeRate(eurBrlRate("6")).rate).toBe("0.1666666667");
    // 1 / 0.0002097152 = 4768.37158203125 exactly: a tie, rounded up.
    expect(invertExchangeRate(eurBrlRate("0.0002097152")).rate).toBe("4768.3715820313");
  });

  it("rejects zero and negative rates, even when built without createExchangeRate", () => {
    const raw = (rate: string): ExchangeRate => ({ ...eurBrlRate("6"), rate });

    expect(() => invertExchangeRate(raw("0"))).toThrowError(invalidRate);
    expect(() => invertExchangeRate(raw("-6.2"))).toThrowError(invalidRate);
  });

  it("rejects a rate whose inverse rounds to zero", () => {
    expect(() => invertExchangeRate(eurBrlRate("100000000000"))).toThrowError(invalidRate);
  });

  it("does not convert money: convertMoney reads the inverse like any other rate", () => {
    const brl = moneyFromDecimal("1000.00", "BRL");
    const eurBrl = eurBrlRate("6.20");

    expect(formatMoney(convertMoney(brl, eurBrl, "EUR"))).toBe("EUR 161.29");
    expect(formatMoney(convertMoney(brl, invertExchangeRate(eurBrl), "EUR"))).toBe("EUR 161.29");
  });
});

describe("invertExchangeRate: properties over many rates (BR-82)", () => {
  /** Deterministic pseudo-random rates (a linear congruential generator), so failures reproduce. */
  function* generatedRates(count: number): Generator<string> {
    let seed = 20_260_930n;
    const next = (modulus: bigint) => {
      seed = (seed * 6_364_136_223_846_793_005n + 1_442_695_040_888_963_407n) % 2n ** 64n;
      return seed % modulus;
    };
    for (let index = 0; index < count; index++) {
      const coefficient = next(10n ** BigInt(1 + Number(next(12n)))) + 1n;
      const scale = Number(next(11n));
      const digits = coefficient.toString().padStart(scale + 1, "0");
      yield scale === 0 ? digits : `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
    }
  }

  const invertible = [...generatedRates(2_000)].filter((rate) => {
    try {
      invertExchangeRate(eurBrlRate(rate));
      return true;
    } catch {
      return false;
    }
  });

  it("covers a wide range of invertible rates", () => {
    expect(invertible.length).toBeGreaterThan(1_500);
  });

  it("never produces zero, loses a currency or leaves the ten-decimal precision", () => {
    for (const written of invertible) {
      const inverse = invertExchangeRate(eurBrlRate(written));
      const decimal = parseDecimal(inverse.rate);

      expect(decimal.coefficient).toBeGreaterThan(0n);
      expect(decimal.scale).toBeLessThanOrEqual(10);
      expect([inverse.baseCurrency, inverse.quoteCurrency]).toEqual(["BRL", "EUR"]);
      expect(invertExchangeRate(eurBrlRate(written))).toEqual(inverse);
    }
  });

  it("returns the original rate after two inversions, within the rate precision", () => {
    // Each inversion rounds by at most u/2 (u = 10^-10). Inverting r, then the result,
    // gives |r'' − r| ≤ u/2 · (1 + 2r²). Checked exactly, in integers:
    // 2 · |r'' − r| · 10^10 ≤ 1 + 2r²
    for (const written of invertible) {
      const original = eurBrlRate(written);
      const twice = invertExchangeRate(invertExchangeRate(original));
      const r = parseDecimal(original.rate);
      const r2 = parseDecimal(twice.rate);
      const difference =
        r2.coefficient * 10n ** BigInt(r.scale) - r.coefficient * 10n ** BigInt(r2.scale);
      const absoluteDifference = difference < 0n ? -difference : difference;
      const rScaleSquared = 10n ** BigInt(2 * r.scale);

      // Both sides multiplied by 10^(r.scale + r2.scale) · 10^(2·r.scale).
      const left = 2n * absoluteDifference * 10n ** 10n * rScaleSquared;
      const right = (rScaleSquared + 2n * r.coefficient ** 2n) * 10n ** BigInt(r.scale + r2.scale);
      expect(left <= right, `double inversion of ${written} gave ${twice.rate}`).toBe(true);
      expect(twice.baseCurrency).toBe("EUR");
    }
  });

  it("stays within 10^-8 of realistic EUR/BRL rates after two inversions", () => {
    const inTenthDecimals = (rate: string) => {
      const { coefficient, scale } = parseDecimal(rate);
      return coefficient * 10n ** BigInt(10 - scale);
    };

    for (const written of ["4.5", "5.8823", "6.2", "6.123456", "7.1", "12.3456789"]) {
      const twice = invertExchangeRate(invertExchangeRate(eurBrlRate(written)));
      const difference = inTenthDecimals(twice.rate) - inTenthDecimals(written);

      expect(difference < 0n ? -difference : difference).toBeLessThanOrEqual(100n);
    }
  });
});
