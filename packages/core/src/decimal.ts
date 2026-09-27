import { DomainError } from "./domain-error.ts";

/**
 * An exact decimal number: `coefficient × 10^-scale`.
 * "6.25" is { coefficient: 625n, scale: 2 }. Never a floating point number.
 */
export type Decimal = Readonly<{ coefficient: bigint; scale: number }>;

const DECIMAL_PATTERN = /^(-?)(\d+)(?:\.(\d+))?$/;

export function parseDecimal(value: string): Decimal {
  const match = DECIMAL_PATTERN.exec(value);
  if (!match) {
    throw new DomainError("INVALID_DECIMAL", `"${value}" is not a valid decimal number.`);
  }

  const [, sign = "", integerDigits = "", fractionDigits = ""] = match;
  return {
    coefficient: BigInt(`${sign}${integerDigits}${fractionDigits}`),
    scale: fractionDigits.length,
  };
}

export function formatDecimal(decimal: Decimal): string {
  const isNegative = decimal.coefficient < 0n;
  const digits = (isNegative ? -decimal.coefficient : decimal.coefficient)
    .toString()
    .padStart(decimal.scale + 1, "0");

  const integerPart = digits.slice(0, digits.length - decimal.scale);
  const fractionPart = digits.slice(digits.length - decimal.scale);
  const sign = isNegative ? "-" : "";

  return decimal.scale === 0 ? `${sign}${integerPart}` : `${sign}${integerPart}.${fractionPart}`;
}

export function powerOfTen(exponent: number): bigint {
  return 10n ** BigInt(exponent);
}

/**
 * Integer division rounded to the nearest integer, ties away from zero
 * (the usual "half-up" of financial rounding): 2.5 → 3, -2.5 → -3.
 */
export function divideRoundingHalfAwayFromZero(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) {
    throw new RangeError("Division by zero.");
  }

  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const absoluteRemainder = remainder < 0n ? -remainder : remainder;
  const absoluteDenominator = denominator < 0n ? -denominator : denominator;

  if (absoluteRemainder * 2n < absoluteDenominator) {
    return quotient;
  }

  const resultIsNegative = numerator < 0n !== denominator < 0n;
  return resultIsNegative ? quotient - 1n : quotient + 1n;
}
