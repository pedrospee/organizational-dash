import { addMoney, type Money, negateMoney, subtractMoney, zeroMoney } from "../money/money.ts";
import type { Account } from "./account.ts";
import { calculateAccountBalance } from "./balances.ts";
import type { Transaction } from "./transaction.ts";

/**
 * Overdraft values derived from the balance and the limit (BR-22).
 * `availableIncludingOverdraft` is balance plus limit; it is not the future
 * "Available to Spend" (BR-65), which also subtracts planned obligations.
 */
export type Overdraft = Readonly<{
  limit: Money;
  /** How far the balance is below zero. */
  used: Money;
  /** How much of the limit is still unused. */
  remaining: Money;
  /** How far the balance is beyond the limit; the ledger records it, never rejects it. */
  exceeded: Money;
  /** Balance plus limit, never below zero. */
  availableIncludingOverdraft: Money;
}>;

/**
 * Derives the overdraft of an account from the ledger (BR-22). Returns null for
 * an account without an overdraft limit: its balance may still be negative.
 */
export function calculateOverdraft(
  account: Account,
  transactions: readonly Transaction[],
): Overdraft | null {
  const limit = account.overdraftLimit;
  if (limit === undefined) {
    return null;
  }

  const balance = calculateAccountBalance(account, transactions);
  const used = atLeastZero(negateMoney(balance));

  return {
    limit,
    used,
    remaining: atLeastZero(subtractMoney(limit, used)),
    exceeded: atLeastZero(subtractMoney(used, limit)),
    availableIncludingOverdraft: atLeastZero(addMoney(balance, limit)),
  };
}

function atLeastZero(money: Money): Money {
  return money.amountMinor < 0n ? zeroMoney(money.currency) : money;
}
