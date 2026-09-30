import { describe, expect, it } from "vitest";
import {
  applicableExchangeRateQuerySchema,
  createExchangeRateRequestSchema,
  listExchangeRatesQuerySchema,
} from "./exchange-rate.ts";

const valid = {
  baseCurrency: "EUR",
  quoteCurrency: "BRL",
  rate: "6.2",
  effectiveDate: "2026-09-30",
};
const accepts = (body: unknown) => createExchangeRateRequestSchema.safeParse(body).success;

describe("createExchangeRateRequestSchema", () => {
  it("accepts a manual rate as a decimal string", () => {
    for (const rate of ["6.2", "6.20", "6", "0.1612903226"]) {
      expect(accepts({ ...valid, rate })).toBe(true);
    }
  });

  it("rejects numbers, signs, exponents and other spellings that are not decimal strings", () => {
    for (const rate of [6.2, "-6.2", "+6.2", "6,2", "6.", ".2", "6e2", " 6.2", "", "NaN"]) {
      expect(accepts({ ...valid, rate })).toBe(false);
    }
    expect(accepts({ ...valid, rate: "1".repeat(33) })).toBe(false);
  });

  it("rejects fields the server controls, and unknown fields", () => {
    for (const extra of [
      { source: "MANUAL" },
      { source: "TRANSACTION" },
      { recordedAt: "2026-09-30T10:00:00.000Z" },
      { id: "chosen-by-client" },
    ]) {
      expect(accepts({ ...valid, ...extra })).toBe(false);
    }
  });

  it("rejects unknown currencies and dates in another format", () => {
    expect(accepts({ ...valid, quoteCurrency: "USD" })).toBe(false);
    expect(accepts({ ...valid, baseCurrency: "eur" })).toBe(false);
    expect(accepts({ ...valid, effectiveDate: "30/09/2026" })).toBe(false);
    expect(accepts({ ...valid, effectiveDate: "2026-09-30T00:00:00Z" })).toBe(false);
  });

  it("leaves financial rules to the core: BRL/EUR, zero and impossible dates are valid shapes", () => {
    expect(accepts({ ...valid, baseCurrency: "BRL", quoteCurrency: "EUR" })).toBe(true);
    expect(accepts({ ...valid, rate: "0" })).toBe(true);
    expect(accepts({ ...valid, effectiveDate: "2026-02-30" })).toBe(true);
  });
});

describe("exchange rate queries", () => {
  it("lists without parameters and rejects unknown ones", () => {
    expect(listExchangeRatesQuerySchema.safeParse({}).success).toBe(true);
    expect(listExchangeRatesQuerySchema.safeParse({ source: "MANUAL" }).success).toBe(false);
  });

  it("requires the date of the applicable rate", () => {
    expect(applicableExchangeRateQuerySchema.safeParse({ on: "2026-09-30" }).success).toBe(true);
    expect(applicableExchangeRateQuerySchema.safeParse({}).success).toBe(false);
    expect(applicableExchangeRateQuerySchema.safeParse({ on: "today" }).success).toBe(false);
  });
});
