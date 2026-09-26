import {
  divideRoundingHalfAwayFromZero,
  formatDecimal,
  parseDecimal,
  powerOfTen,
} from "../decimal.ts";
import { DomainError } from "../domain-error.ts";
import type { LocalDate } from "../local-date.ts";
import { CURRENCIES, type Currency, MINOR_UNIT_DIGITS } from "../money/currency.ts";
import { createMoney, type Money } from "../money/money.ts";

export const EXCHANGE_RATE_SOURCES = ["MANUAL", "TRANSACTION"] as const;

/**
 * MANUAL: typed in by the user for reporting.
 * TRANSACTION: derived from the two real legs of an executed operation.
 */
export type ExchangeRateSource = (typeof EXCHANGE_RATE_SOURCES)[number];

/**
 * `rate` units of quoteCurrency buy one unit of baseCurrency.
 * EUR/BRL "6.00" means 1 EUR = 6 BRL. The rate is an exact decimal string.
 */
export type ExchangeRate = Readonly<{
  baseCurrency: Currency;
  quoteCurrency: Currency;
  rate: string;
  effectiveDate: LocalDate;
  source: ExchangeRateSource;
  /** ISO 8601 timestamp of when the rate was recorded. */
  recordedAt: string;
}>;

const MAX_RATE_DECIMAL_PLACES = 10;
const EXECUTED_RATE_DECIMAL_PLACES = 6;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

export function createExchangeRate(input: ExchangeRate): ExchangeRate {
  if (input.baseCurrency === input.quoteCurrency) {
    throw new DomainError(
      "INVALID_EXCHANGE_RATE",
      `An exchange rate needs two different currencies, got ${input.baseCurrency}/${input.quoteCurrency}.`,
    );
  }

  const rate = parseDecimal(input.rate);
  if (rate.coefficient <= 0n) {
    throw new DomainError(
      "INVALID_EXCHANGE_RATE",
      `Exchange rate must be positive, got ${input.rate}.`,
    );
  }
  if (rate.scale > MAX_RATE_DECIMAL_PLACES) {
    throw new DomainError(
      "INVALID_EXCHANGE_RATE",
      `Exchange rate allows at most ${MAX_RATE_DECIMAL_PLACES} decimal places, got ${input.rate}.`,
    );
  }

  if (!ISO_TIMESTAMP_PATTERN.test(input.recordedAt) || Number.isNaN(Date.parse(input.recordedAt))) {
    throw new DomainError(
      "INVALID_EXCHANGE_RATE",
      `recordedAt must be an ISO 8601 timestamp, got "${input.recordedAt}".`,
    );
  }

  return { ...input };
}

/**
 * Converts an amount with the given rate, in either direction of the pair,
 * rounding half away from zero to the target currency's minor unit.
 * The original amount is never modified; a new Money is returned.
 */
export function convertMoney(
  money: Money,
  exchangeRate: ExchangeRate,
  targetCurrency: Currency,
): Money {
  const rate = parseDecimal(exchangeRate.rate);
  const baseDigits = MINOR_UNIT_DIGITS[exchangeRate.baseCurrency];
  const quoteDigits = MINOR_UNIT_DIGITS[exchangeRate.quoteCurrency];

  if (
    money.currency === exchangeRate.baseCurrency &&
    targetCurrency === exchangeRate.quoteCurrency
  ) {
    const numerator = money.amountMinor * rate.coefficient * powerOfTen(quoteDigits);
    const denominator = powerOfTen(rate.scale + baseDigits);
    return createMoney(divideRoundingHalfAwayFromZero(numerator, denominator), targetCurrency);
  }

  if (
    money.currency === exchangeRate.quoteCurrency &&
    targetCurrency === exchangeRate.baseCurrency
  ) {
    const numerator = money.amountMinor * powerOfTen(rate.scale + baseDigits);
    const denominator = rate.coefficient * powerOfTen(quoteDigits);
    return createMoney(divideRoundingHalfAwayFromZero(numerator, denominator), targetCurrency);
  }

  throw new DomainError(
    "CURRENCY_MISMATCH",
    `A ${exchangeRate.baseCurrency}/${exchangeRate.quoteCurrency} rate cannot convert ${money.currency} to ${targetCurrency}.`,
  );
}

/**
 * Derives the rate actually obtained in a real operation from its two legs
 * (e.g. €100 sent, R$600 received → EUR/BRL 6.000000). The legs are the
 * source of truth; this rate is stored for information and analysis.
 */
export function calculateExecutedRate(
  firstLeg: Money,
  secondLeg: Money,
  timing: Pick<ExchangeRate, "effectiveDate" | "recordedAt">,
): ExchangeRate {
  if (firstLeg.amountMinor <= 0n || secondLeg.amountMinor <= 0n) {
    throw new DomainError("INVALID_AMOUNT", "Both legs of an exchange must be positive amounts.");
  }

  const [baseLeg, quoteLeg] = orderByCanonicalPair(firstLeg, secondLeg);
  const baseDigits = MINOR_UNIT_DIGITS[baseLeg.currency];
  const quoteDigits = MINOR_UNIT_DIGITS[quoteLeg.currency];

  const coefficient = divideRoundingHalfAwayFromZero(
    quoteLeg.amountMinor * powerOfTen(baseDigits + EXECUTED_RATE_DECIMAL_PLACES),
    baseLeg.amountMinor * powerOfTen(quoteDigits),
  );

  return createExchangeRate({
    baseCurrency: baseLeg.currency,
    quoteCurrency: quoteLeg.currency,
    rate: formatDecimal({ coefficient, scale: EXECUTED_RATE_DECIMAL_PLACES }),
    source: "TRANSACTION",
    ...timing,
  });
}

/** Rates are always expressed with the earlier currency in CURRENCIES as base (EUR/BRL). */
function orderByCanonicalPair(firstLeg: Money, secondLeg: Money): [Money, Money] {
  if (firstLeg.currency === secondLeg.currency) {
    throw new DomainError("CURRENCY_MISMATCH", "An exchange needs two different currencies.");
  }

  const firstIsBase =
    CURRENCIES.indexOf(firstLeg.currency) < CURRENCIES.indexOf(secondLeg.currency);
  return firstIsBase ? [firstLeg, secondLeg] : [secondLeg, firstLeg];
}
