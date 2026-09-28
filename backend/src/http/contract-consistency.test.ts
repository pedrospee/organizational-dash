import { type CurrencyJson, currencySchema } from "@solvia/contracts";
import { CURRENCIES, type Currency } from "@solvia/core";
import { describe, expect, expectTypeOf, it } from "vitest";

// @solvia/contracts deliberately does not depend on @solvia/core (ADR-0003), so the
// values both packages define are duplicated. The backend sees both and checks they
// stay identical: the type assertions fail `npm run typecheck`, the others fail tests.
describe("contracts stay consistent with the core", () => {
  it("currencies", () => {
    expectTypeOf<CurrencyJson>().toEqualTypeOf<Currency>();
    expect(currencySchema.options).toEqual(CURRENCIES);
  });
});
