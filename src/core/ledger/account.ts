import { DomainError } from "../domain-error.ts";
import type { Currency } from "../money/currency.ts";

export const ASSET_ACCOUNT_KINDS = ["BANK", "WISE", "CASH", "INVESTMENT"] as const;

export const LIABILITY_ACCOUNT_KINDS = [
  "CREDIT_CARD",
  "LOAN",
  "FINANCING",
  "INFORMAL_DEBT",
  "PERSONAL_DEBT",
  "OTHER_LIABILITY",
] as const;

export type AccountKind =
  | (typeof ASSET_ACCOUNT_KINDS)[number]
  | (typeof LIABILITY_ACCOUNT_KINDS)[number];

export type AccountNature = "ASSET" | "LIABILITY";

/**
 * A place where money is held (asset) or owed (liability), in one currency.
 * The balance is never stored here: it is derived from the ledger.
 */
export type Account = Readonly<{
  id: string;
  name: string;
  institution?: string;
  kind: AccountKind;
  currency: Currency;
}>;

export function createAccount(input: Account): Account {
  const id = input.id.trim();
  const name = input.name.trim();

  if (id === "" || name === "") {
    throw new DomainError("INVALID_ACCOUNT", "An account needs a non-empty id and name.");
  }

  return { ...input, id, name };
}

export function getAccountNature(kind: AccountKind): AccountNature {
  const liabilityKinds: readonly AccountKind[] = LIABILITY_ACCOUNT_KINDS;
  return liabilityKinds.includes(kind) ? "LIABILITY" : "ASSET";
}
