// Public API of @solvia/contracts: the JSON representation of the Solvia API.
// It depends only on Zod, never on @solvia/core or the backend.

export {
  type AccountKindJson,
  type AccountListResponse,
  type AccountResponse,
  accountKindSchema,
  accountListResponseSchema,
  accountResponseSchema,
  type CreateAccountRequest,
  createAccountRequestSchema,
  listAccountsQuerySchema,
  type UpdateAccountRequest,
  updateAccountRequestSchema,
} from "./account.ts";
export {
  type CategoryListResponse,
  type CategoryNatureJson,
  type CategoryResponse,
  type CreateCategoryRequest,
  categoryListResponseSchema,
  categoryNatureSchema,
  categoryResponseSchema,
  createCategoryRequestSchema,
  listCategoriesQuerySchema,
  type UpdateCategoryRequest,
  updateCategoryRequestSchema,
} from "./category.ts";
export { type ErrorResponse, errorResponseSchema } from "./error.ts";
export {
  applicableExchangeRateQuerySchema,
  type CreateExchangeRateRequest,
  createExchangeRateRequestSchema,
  type ExchangeRateListResponse,
  type ExchangeRateResponse,
  type ExchangeRateSourceJson,
  exchangeRateListResponseSchema,
  exchangeRateResponseSchema,
  exchangeRateSourceSchema,
  listExchangeRatesQuerySchema,
  rateSchema,
} from "./exchange-rate.ts";
export { localDateSchema } from "./local-date.ts";
export {
  amountMinorSchema,
  type CurrencyJson,
  currencySchema,
  type MoneyJson,
  moneySchema,
} from "./money.ts";
