import type { CreateExchangeRateRequest, ExchangeRateResponse } from "@solvia/contracts";
import { parseLocalDate } from "@solvia/core";
import type { ExchangeRateRecord } from "../../modules/exchange-rates/exchange-rate-repository.ts";
import type { NewManualExchangeRate } from "../../modules/exchange-rates/exchange-rate-service.ts";

// The rate stays a decimal string end to end; only the date becomes a core LocalDate.

export function newManualExchangeRateFromJson(
  json: CreateExchangeRateRequest,
): NewManualExchangeRate {
  return { ...json, effectiveDate: parseLocalDate(json.effectiveDate) };
}

export function exchangeRateToJson({ id, exchangeRate }: ExchangeRateRecord): ExchangeRateResponse {
  return { id, ...exchangeRate };
}
