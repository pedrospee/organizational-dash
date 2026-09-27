import { DomainError } from "../domain-error.ts";
import type { LocalDate } from "../local-date.ts";
import type { Currency } from "../money/currency.ts";
import type { Money } from "../money/money.ts";
import { convertMoney, type ExchangeRate } from "./exchange-rate.ts";

/**
 * Finds the rate in force on a date: the latest rate for the currency pair
 * (in either direction) whose effective date is on or before that date.
 * Pass today's date for current reports and a past date for historical analysis.
 */
export function findApplicableRate(
  rates: readonly ExchangeRate[],
  firstCurrency: Currency,
  secondCurrency: Currency,
  onDate: LocalDate,
): ExchangeRate | undefined {
  const candidates = rates.filter(
    (rate) => coversPair(rate, firstCurrency, secondCurrency) && rate.effectiveDate <= onDate,
  );

  return candidates.reduce<ExchangeRate | undefined>(
    (latest, rate) => (latest === undefined || isMoreRecent(rate, latest) ? rate : latest),
    undefined,
  );
}

/** Converts using the rate in force on the date; same-currency amounts are returned as they are. */
export function convertMoneyOnDate(
  money: Money,
  targetCurrency: Currency,
  rates: readonly ExchangeRate[],
  onDate: LocalDate,
): Money {
  if (money.currency === targetCurrency) {
    return money;
  }

  const rate = findApplicableRate(rates, money.currency, targetCurrency, onDate);
  if (!rate) {
    throw new DomainError(
      "EXCHANGE_RATE_NOT_FOUND",
      `No ${money.currency}/${targetCurrency} exchange rate on or before ${onDate}.`,
    );
  }

  return convertMoney(money, rate, targetCurrency);
}

function coversPair(
  rate: ExchangeRate,
  firstCurrency: Currency,
  secondCurrency: Currency,
): boolean {
  return (
    (rate.baseCurrency === firstCurrency && rate.quoteCurrency === secondCurrency) ||
    (rate.baseCurrency === secondCurrency && rate.quoteCurrency === firstCurrency)
  );
}

function isMoreRecent(candidate: ExchangeRate, current: ExchangeRate): boolean {
  if (candidate.effectiveDate !== current.effectiveDate) {
    return candidate.effectiveDate > current.effectiveDate;
  }
  return Date.parse(candidate.recordedAt) > Date.parse(current.recordedAt);
}
