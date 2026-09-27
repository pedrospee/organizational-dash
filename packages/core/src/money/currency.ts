export const CURRENCIES = ["EUR", "BRL"] as const;

export type Currency = (typeof CURRENCIES)[number];

/** Number of decimal digits in one major unit (1 EUR = 100 cents). */
export const MINOR_UNIT_DIGITS: Readonly<Record<Currency, number>> = {
  EUR: 2,
  BRL: 2,
};
