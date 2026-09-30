import { z } from "zod";
import { localDateSchema } from "./local-date.ts";
import { currencySchema } from "./money.ts";

// Kept explicit here instead of importing @solvia/core (ADR-0003); a backend test
// fails if this list drifts from the core's EXCHANGE_RATE_SOURCES.
export const exchangeRateSourceSchema = z.enum(["MANUAL", "TRANSACTION"]);

export type ExchangeRateSourceJson = z.infer<typeof exchangeRateSourceSchema>;

/**
 * A rate as an unsigned decimal string, never a JSON number: "6.2" means 1 EUR = 6.20 BRL.
 * Only the representation is checked here. Zero, the ten-decimal precision, the
 * canonical spelling and the EUR/BRL pair are rules of @solvia/core (BR-80, BR-83).
 * The length limit only bounds the payload.
 */
export const rateSchema = z
  .string()
  .max(32)
  .regex(/^\d+(\.\d+)?$/, { message: 'must be an unsigned decimal number such as "6.2"' });

/**
 * POST /api/exchange-rates. Manual rates only: `source` and `recordedAt` are set by
 * the server, so sending them is rejected. Rates are append-only (no PATCH or DELETE).
 */
export const createExchangeRateRequestSchema = z.strictObject({
  baseCurrency: currencySchema,
  quoteCurrency: currencySchema,
  rate: rateSchema,
  effectiveDate: localDateSchema,
});

export type CreateExchangeRateRequest = z.infer<typeof createExchangeRateRequestSchema>;

/** GET /api/exchange-rates. The whole history, with no filters for now. */
export const listExchangeRatesQuerySchema = z.strictObject({});

/** GET /api/exchange-rates/applicable?on=YYYY-MM-DD: the EUR/BRL rate in force on a date. */
export const applicableExchangeRateQuerySchema = z.strictObject({
  on: localDateSchema,
});

export const exchangeRateResponseSchema = z.strictObject({
  id: z.string(),
  baseCurrency: currencySchema,
  quoteCurrency: currencySchema,
  rate: z.string(),
  effectiveDate: z.string(),
  source: exchangeRateSourceSchema,
  recordedAt: z.iso.datetime(),
});

export type ExchangeRateResponse = z.infer<typeof exchangeRateResponseSchema>;

export const exchangeRateListResponseSchema = z.strictObject({
  items: z.array(exchangeRateResponseSchema),
});

export type ExchangeRateListResponse = z.infer<typeof exchangeRateListResponseSchema>;
