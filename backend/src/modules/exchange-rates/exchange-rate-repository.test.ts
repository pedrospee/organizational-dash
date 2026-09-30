import { parseLocalDate } from "@solvia/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../../infrastructure/database/test-fixtures.ts";
import {
  createExchangeRateRepository,
  type ExchangeRateRecord,
} from "./exchange-rate-repository.ts";

function record(
  id: string,
  effectiveDate: string,
  recordedAt: string,
  rate = "6.2",
): ExchangeRateRecord {
  return {
    id,
    exchangeRate: {
      baseCurrency: "EUR",
      quoteCurrency: "BRL",
      rate,
      effectiveDate: parseLocalDate(effectiveDate),
      source: "MANUAL",
      recordedAt,
    },
  };
}

let database: TestDatabase;

beforeEach(() => {
  database = createTestDatabase();
});

afterEach(() => {
  database.sqlite.close();
});

describe("exchange rate repository", () => {
  it("round-trips a rate, keeping the decimal string exactly as TEXT", () => {
    const repository = createExchangeRateRepository(database.db);
    const rate = record("r1", "2026-09-30", "2026-09-30T10:00:00.000Z", "0.1612903226");

    repository.insert(rate);

    expect(repository.findById("r1")).toEqual(rate);
    expect(repository.findById("missing")).toBeUndefined();
    const stored = database.sqlite
      .prepare("SELECT typeof(rate) AS type, rate FROM exchange_rates")
      .get() as { type: string; rate: string };
    expect(stored).toEqual({ type: "text", rate: "0.1612903226" });
  });

  it("lists the whole history by effective date, then by recording time", () => {
    const repository = createExchangeRateRepository(database.db);
    const later = record("r1", "2026-09-30", "2026-09-30T15:00:00.000Z", "6.25");
    const earlier = record("r2", "2026-09-30", "2026-09-30T10:00:00.000Z", "6.2");
    const older = record("r3", "2026-09-01", "2026-09-30T16:00:00.000Z", "6.1");
    for (const rate of [later, earlier, older]) {
      repository.insert(rate);
    }

    expect(repository.list()).toEqual([older, earlier, later]);
  });

  it("keeps two rates for the same pair and date: there is no uniqueness (BR-81)", () => {
    const repository = createExchangeRateRepository(database.db);
    repository.insert(record("r1", "2026-09-30", "2026-09-30T10:00:00.000Z", "6.2"));
    repository.insert(record("r2", "2026-09-30", "2026-09-30T15:00:00.000Z", "6.25"));

    expect(repository.list().map(({ id }) => id)).toEqual(["r1", "r2"]);
  });

  it("reports the latest recordedAt, or nothing for an empty history", () => {
    const repository = createExchangeRateRepository(database.db);
    expect(repository.latestRecordedAt()).toBeUndefined();

    repository.insert(record("r1", "2026-09-30", "2026-09-30T15:00:00.000Z"));
    repository.insert(record("r2", "2026-10-01", "2026-09-30T10:00:00.000Z"));

    expect(repository.latestRecordedAt()).toBe("2026-09-30T15:00:00.000Z");
  });

  it("offers no way to change or remove a rate (BR-81)", () => {
    const repository = createExchangeRateRepository(database.db);

    expect(Object.keys(repository).sort()).toEqual([
      "findById",
      "insert",
      "latestRecordedAt",
      "list",
    ]);
  });

  it("rejects a second rate with the same id", () => {
    const repository = createExchangeRateRepository(database.db);
    repository.insert(record("r1", "2026-09-30", "2026-09-30T10:00:00.000Z", "6.2"));

    expect(() =>
      repository.insert(record("r1", "2026-09-30", "2026-09-30T11:00:00.000Z", "9.9")),
    ).toThrow();
    expect(repository.findById("r1")?.exchangeRate.rate).toBe("6.2");
  });
});
