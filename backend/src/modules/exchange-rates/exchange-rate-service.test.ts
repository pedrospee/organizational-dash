import { parseLocalDate } from "@solvia/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../../infrastructure/database/test-fixtures.ts";
import { createExchangeRateRepository } from "./exchange-rate-repository.ts";
import { createExchangeRateService, type NewManualExchangeRate } from "./exchange-rate-service.ts";

let database: TestDatabase;
let clock: Date;

function service() {
  return createExchangeRateService(createExchangeRateRepository(database.db), {
    now: () => clock,
    // Sequential ids (r1, r2…), so tests can refer to them.
    newId: (() => {
      let sequence = 0;
      return () => `r${++sequence}`;
    })(),
  });
}

function eurBrl(rate: string, effectiveDate = "2026-09-30"): NewManualExchangeRate {
  return {
    baseCurrency: "EUR",
    quoteCurrency: "BRL",
    rate,
    effectiveDate: parseLocalDate(effectiveDate),
  };
}

const code = (expected: string) => expect.objectContaining({ code: expected });

beforeEach(() => {
  database = createTestDatabase();
  clock = new Date("2026-09-30T10:00:00.000Z");
});

afterEach(() => {
  database.sqlite.close();
});

describe("creating manual rates", () => {
  it("records a MANUAL EUR/BRL rate in canonical form, with the server's recordedAt", () => {
    const rates = service();

    expect(rates.create(eurBrl("6.20"))).toEqual({
      id: "r1",
      exchangeRate: {
        baseCurrency: "EUR",
        quoteCurrency: "BRL",
        rate: "6.2",
        effectiveDate: "2026-09-30",
        source: "MANUAL",
        recordedAt: "2026-09-30T10:00:00.000Z",
      },
    });
    expect(rates.get("r1").exchangeRate.rate).toBe("6.2");
  });

  it("lets the core reject BRL/EUR, the same currency twice, zero and too many decimals", () => {
    const rates = service();
    const invalid = [
      { ...eurBrl("0.16"), baseCurrency: "BRL" as const, quoteCurrency: "EUR" as const },
      { ...eurBrl("1"), quoteCurrency: "EUR" as const },
      eurBrl("0"),
      eurBrl("0.000"),
      eurBrl("6.12345678901"),
      eurBrl("100000000000"),
    ];

    for (const input of invalid) {
      expect(() => rates.create(input)).toThrowError(code("INVALID_EXCHANGE_RATE"));
    }
    expect(rates.list()).toEqual([]);
  });
});

describe("append-only history (BR-81)", () => {
  it("keeps a correction next to the original: nothing is replaced", () => {
    const rates = service();
    rates.create(eurBrl("6.20"));
    clock = new Date("2026-09-30T15:00:00.000Z");
    rates.create(eurBrl("6.25"));

    expect(
      rates.list().map(({ exchangeRate }) => [exchangeRate.rate, exchangeRate.recordedAt]),
    ).toEqual([
      ["6.2", "2026-09-30T10:00:00.000Z"],
      ["6.25", "2026-09-30T15:00:00.000Z"],
    ]);
  });

  it("uses the rate recorded last for a date, while older dates keep their own rate", () => {
    const rates = service();
    rates.create(eurBrl("6.10", "2026-09-01"));
    clock = new Date("2026-09-30T11:00:00.000Z");
    rates.create(eurBrl("6.20"));
    clock = new Date("2026-09-30T15:00:00.000Z");
    rates.create(eurBrl("6.25"));

    expect(rates.findApplicable(parseLocalDate("2026-09-30")).exchangeRate.rate).toBe("6.25");
    expect(rates.findApplicable(parseLocalDate("2026-12-31")).exchangeRate.rate).toBe("6.25");
    expect(rates.findApplicable(parseLocalDate("2026-09-15")).exchangeRate.rate).toBe("6.1");
  });

  it("a later correction of an old date never overrides a newer date", () => {
    const rates = service();
    rates.create(eurBrl("6.20", "2026-09-30"));
    clock = new Date("2026-10-01T09:00:00.000Z");
    rates.create(eurBrl("6.05", "2026-09-01"));

    expect(rates.findApplicable(parseLocalDate("2026-09-30")).exchangeRate.rate).toBe("6.2");
    expect(rates.findApplicable(parseLocalDate("2026-09-10")).exchangeRate.rate).toBe("6.05");
  });

  it("orders rates recorded in the same millisecond, or with the clock set back", () => {
    const rates = service();
    rates.create(eurBrl("6.20"));
    rates.create(eurBrl("6.25"));
    clock = new Date("2026-09-30T09:00:00.000Z");
    rates.create(eurBrl("6.30"));

    expect(rates.list().map(({ exchangeRate }) => exchangeRate.recordedAt)).toEqual([
      "2026-09-30T10:00:00.000Z",
      "2026-09-30T10:00:00.001Z",
      "2026-09-30T10:00:00.002Z",
    ]);
    expect(rates.findApplicable(parseLocalDate("2026-09-30")).exchangeRate.rate).toBe("6.3");
  });

  it("reports EXCHANGE_RATE_NOT_FOUND before the first rate, and for an unknown id", () => {
    const rates = service();
    expect(() => rates.findApplicable(parseLocalDate("2026-09-30"))).toThrowError(
      code("EXCHANGE_RATE_NOT_FOUND"),
    );

    rates.create(eurBrl("6.20", "2026-09-30"));

    expect(() => rates.findApplicable(parseLocalDate("2026-09-29"))).toThrowError(
      code("EXCHANGE_RATE_NOT_FOUND"),
    );
    expect(() => rates.get("missing")).toThrowError(code("EXCHANGE_RATE_NOT_FOUND"));
  });
});
