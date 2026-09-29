import { DomainError } from "../domain-error.ts";
import type { Currency } from "../money/currency.ts";
import type { Money } from "../money/money.ts";

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
  /**
   * BR-22: how far a BANK account may go below zero. Absent means no limit.
   * It never blocks the ledger; overdraft values are derived by calculateOverdraft.
   */
  overdraftLimit?: Money;
}>;

export function createAccount(input: Account): Account {
  const id = input.id.trim();
  const name = input.name.trim();

  if (id === "" || name === "") {
    throw new DomainError("INVALID_ACCOUNT", "An account needs a non-empty id and name.");
  }
  if (input.overdraftLimit !== undefined) {
    assertValidOverdraftLimit(input.kind, input.currency, input.overdraftLimit);
  }

  return { ...input, id, name };
}

/** BR-22: only BANK accounts, in the account's currency, strictly above zero. */
function assertValidOverdraftLimit(kind: AccountKind, currency: Currency, limit: Money): void {
  if (kind !== "BANK") {
    throw new DomainError(
      "INVALID_ACCOUNT",
      `Only BANK accounts can have an overdraft limit, not ${kind}.`,
    );
  }
  if (limit.currency !== currency) {
    throw new DomainError(
      "INVALID_ACCOUNT",
      `The overdraft limit must be in the account's currency (${currency}), got ${limit.currency}.`,
    );
  }
  if (limit.amountMinor <= 0n) {
    throw new DomainError(
      "INVALID_ACCOUNT",
      "The overdraft limit must be greater than zero; leave it out for no limit.",
    );
  }
}

export function getAccountNature(kind: AccountKind): AccountNature {
  const liabilityKinds: readonly AccountKind[] = LIABILITY_ACCOUNT_KINDS;
  return liabilityKinds.includes(kind) ? "LIABILITY" : "ASSET";
}
