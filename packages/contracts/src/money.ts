import { z } from "zod";

// Kept explicit here instead of importing @solvia/core (ADR-0003); a backend test
// fails if this list drifts from the core's CURRENCIES.
export const currencySchema = z.enum(["EUR", "BRL"]);

export type CurrencyJson = z.infer<typeof currencySchema>;

// SQLite stores money as a signed 64-bit INTEGER; larger values cannot be persisted.
const MIN_STORABLE_AMOUNT = -(2n ** 63n);
const MAX_STORABLE_AMOUNT = 2n ** 63n - 1n;

/**
 * An amount in integer minor units, as a string because JSON has no bigint:
 * €10.50 is "1050". Only the representation is checked here; whether an amount
 * may be negative or zero is a financial rule decided by @solvia/core.
 */
export const amountMinorSchema = z
  .string()
  // abort: Zod 4 would otherwise still run the range check, and BigInt() throws on "10.50".
  .regex(/^-?(0|[1-9]\d*)$/, { message: "must be an integer amount in minor units", abort: true })
  .refine(
    (value) => {
      const amount = BigInt(value);
      return amount >= MIN_STORABLE_AMOUNT && amount <= MAX_STORABLE_AMOUNT;
    },
    { message: "is outside the storable range" },
  );

export const moneySchema = z.strictObject({
  amountMinor: amountMinorSchema,
  currency: currencySchema,
});

export type MoneyJson = z.infer<typeof moneySchema>;
