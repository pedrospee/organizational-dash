import {
  applicableExchangeRateQuerySchema,
  createExchangeRateRequestSchema,
  listExchangeRatesQuerySchema,
} from "@solvia/contracts";
import { parseLocalDate } from "@solvia/core";
import { Hono } from "hono";
import type { ExchangeRateService } from "../../modules/exchange-rates/exchange-rate-service.ts";
import { exchangeRateToJson, newManualExchangeRateFromJson } from "../mappers/exchange-rate.ts";
import { validate } from "../validation.ts";

// Append-only (BR-81): no PATCH and no DELETE, so those requests are ROUTE_NOT_FOUND.
export function exchangeRateRoutes(service: ExchangeRateService) {
  return new Hono()
    .get("/", validate("query", listExchangeRatesQuerySchema), (c) => {
      const items = service.list().map(exchangeRateToJson);
      return c.json({ items }, 200);
    })
    .post("/", validate("json", createExchangeRateRequestSchema), (c) => {
      const record = service.create(newManualExchangeRateFromJson(c.req.valid("json")));
      return c.json(exchangeRateToJson(record), 201);
    })
    .get("/applicable", validate("query", applicableExchangeRateQuerySchema), (c) => {
      const record = service.findApplicable(parseLocalDate(c.req.valid("query").on));
      return c.json(exchangeRateToJson(record), 200);
    })
    .get("/:id", (c) => c.json(exchangeRateToJson(service.get(c.req.param("id"))), 200));
}
