import {
  type AccountKindJson,
  accountKindSchema,
  type CurrencyJson,
  currencySchema,
} from "@solvia/contracts";
import {
  type AccountKind,
  ASSET_ACCOUNT_KINDS,
  CURRENCIES,
  type Currency,
  LIABILITY_ACCOUNT_KINDS,
} from "@solvia/core";
import { describe, expect, expectTypeOf, it } from "vitest";

// @solvia/contracts deliberately does not depend on @solvia/core (ADR-0003), so the
// values both packages define are duplicated. The backend sees both and checks they
// stay identical: the type assertions fail `npm run typecheck`, the others fail tests.
describe("contracts stay consistent with the core", () => {
  it("currencies", () => {
    expectTypeOf<CurrencyJson>().toEqualTypeOf<Currency>();
    expect(currencySchema.options).toEqual(CURRENCIES);
  });

  it("account kinds", () => {
    expectTypeOf<AccountKindJson>().toEqualTypeOf<AccountKind>();
    expect(accountKindSchema.options).toEqual([...ASSET_ACCOUNT_KINDS, ...LIABILITY_ACCOUNT_KINDS]);
  });
});
