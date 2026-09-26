import { formatDecimal, parseDecimal, powerOfTen } from "../decimal.ts";
import { DomainError } from "../domain-error.ts";
import { type Currency, MINOR_UNIT_DIGITS } from "./currency.ts";

/**
 * An amount in integer minor units (cents) together with its currency.
 * €10.50 is { amountMinor: 1050n, currency: "EUR" }.
 */
export type Money = Readonly<{ amountMinor: bigint; currency: Currency }>;

export function createMoney(amountMinor: bigint, currency: Currency): Money {
  return { amountMinor, currency };
}

export function zeroMoney(currency: Currency): Money {
  return createMoney(0n, currency);
}

/** Parses a decimal string such as "10.50" without ever using floating point. */
export function moneyFromDecimal(value: string, currency: Currency): Money {
  const decimal = parseDecimal(value);
  const minorUnitDigits = MINOR_UNIT_DIGITS[currency];

  if (decimal.scale > minorUnitDigits) {
    throw new DomainError(
      "INVALID_AMOUNT",
      `${currency} amounts allow at most ${minorUnitDigits} decimal places, got "${value}".`,
    );
  }

  return createMoney(decimal.coefficient * powerOfTen(minorUnitDigits - decimal.scale), currency);
}

export function formatMoney(money: Money): string {
  const amount = formatDecimal({
    coefficient: money.amountMinor,
    scale: MINOR_UNIT_DIGITS[money.currency],
  });
  return `${money.currency} ${amount}`;
}

export function addMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return createMoney(left.amountMinor + right.amountMinor, left.currency);
}

export function subtractMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return createMoney(left.amountMinor - right.amountMinor, left.currency);
}

export function negateMoney(money: Money): Money {
  return createMoney(-money.amountMinor, money.currency);
}

export function sumMoney(amounts: readonly Money[], currency: Currency): Money {
  return amounts.reduce(addMoney, zeroMoney(currency));
}

export function isZeroMoney(money: Money): boolean {
  return money.amountMinor === 0n;
}

/**
 * Splits an amount into equal parts that add up exactly to the total.
 * The remainder goes one minor unit at a time to the last parts:
 * €1,000.00 / 3 → €333.33, €333.33, €333.34.
 */
export function allocateMoney(total: Money, numberOfParts: number): Money[] {
  if (!Number.isInteger(numberOfParts) || numberOfParts < 1) {
    throw new DomainError(
      "INVALID_AMOUNT",
      `Number of parts must be a positive integer, got ${numberOfParts}.`,
    );
  }

  const parts = BigInt(numberOfParts);
  const baseAmount = total.amountMinor / parts;
  const remainder = total.amountMinor % parts;
  const remainderStep = remainder < 0n ? -1n : 1n;
  const partsReceivingRemainder = remainder < 0n ? -remainder : remainder;
  const firstPartReceivingRemainder = parts - partsReceivingRemainder;

  return Array.from({ length: numberOfParts }, (_, index) => {
    const receivesRemainder = BigInt(index) >= firstPartReceivingRemainder;
    return createMoney(baseAmount + (receivesRemainder ? remainderStep : 0n), total.currency);
  });
}

export function assertSameCurrency(left: Money, right: Money): void {
  if (left.currency !== right.currency) {
    throw new DomainError(
      "CURRENCY_MISMATCH",
      `Cannot combine ${left.currency} with ${right.currency} without an exchange rate.`,
    );
  }
}
