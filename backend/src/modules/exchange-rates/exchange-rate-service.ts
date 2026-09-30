import { randomUUID } from "node:crypto";
import {
  CANONICAL_EXCHANGE_RATE_PAIR,
  createManualExchangeRate,
  type ExchangeRate,
  findApplicableRate,
  type LocalDate,
} from "@solvia/core";
import { NotFoundError } from "../errors.ts";
import type { ExchangeRateRecord, ExchangeRateRepository } from "./exchange-rate-repository.ts";

/** What the user types in: the server sets the source (MANUAL) and recordedAt. */
export type NewManualExchangeRate = Omit<ExchangeRate, "source" | "recordedAt">;

export type ExchangeRateService = ReturnType<typeof createExchangeRateService>;

/**
 * Manual exchange rate use cases. Every rate is validated by the core
 * (BR-80, BR-83). Rates are append-only (BR-81): a correction is a new rate,
 * and the one recorded last for a date is the one in force.
 */
export function createExchangeRateService(
  repository: ExchangeRateRepository,
  options: { now?: () => Date; newId?: () => string } = {},
) {
  const clock = options.now ?? (() => new Date());
  const newId = options.newId ?? randomUUID;

  /**
   * recordedAt orders corrections, so it strictly increases: two rates recorded in
   * the same millisecond, or a system clock set back, never produce a tie or an
   * inversion. The client cannot choose it.
   */
  function nextRecordedAt(): string {
    const now = clock().getTime();
    const latest = repository.latestRecordedAt();
    const latestMillis = latest === undefined ? undefined : Date.parse(latest);
    const recordedAt = latestMillis !== undefined && latestMillis >= now ? latestMillis + 1 : now;
    return new Date(recordedAt).toISOString();
  }

  function load(id: string): ExchangeRateRecord {
    const record = repository.findById(id);
    if (record === undefined) {
      throw new NotFoundError("EXCHANGE_RATE_NOT_FOUND", `No exchange rate with id "${id}".`);
    }
    return record;
  }

  return {
    list(): ExchangeRateRecord[] {
      return repository.list();
    },

    get: load,

    create(input: NewManualExchangeRate): ExchangeRateRecord {
      const exchangeRate = createManualExchangeRate({ ...input, recordedAt: nextRecordedAt() });
      const record = { id: newId(), exchangeRate };
      repository.insert(record);
      return record;
    },

    /** The EUR/BRL rate in force on a date (BR-17), chosen by the core. */
    findApplicable(onDate: LocalDate): ExchangeRateRecord {
      const records = repository.list();
      const { baseCurrency, quoteCurrency } = CANONICAL_EXCHANGE_RATE_PAIR;
      const applicable = findApplicableRate(
        records.map(({ exchangeRate }) => exchangeRate),
        baseCurrency,
        quoteCurrency,
        onDate,
      );
      const record = records.find(({ exchangeRate }) => exchangeRate === applicable);
      if (record === undefined) {
        throw new NotFoundError(
          "EXCHANGE_RATE_NOT_FOUND",
          `No ${baseCurrency}/${quoteCurrency} exchange rate on or before ${onDate}.`,
        );
      }
      return record;
    },
  };
}
