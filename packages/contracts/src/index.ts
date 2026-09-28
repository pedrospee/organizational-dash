// Public API of @solvia/contracts: the JSON representation of the Solvia API.
// It depends only on Zod, never on @solvia/core or the backend.

export { type ErrorResponse, errorResponseSchema } from "./error.ts";
export {
  amountMinorSchema,
  type CurrencyJson,
  currencySchema,
  type MoneyJson,
  moneySchema,
} from "./money.ts";
