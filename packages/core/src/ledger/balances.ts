import type { Currency } from "../money/currency.ts";
import { type Money, negateMoney, sumMoney } from "../money/money.ts";
import { type Account, getAccountNature } from "./account.ts";
import type { Category } from "./category.ts";
import type { Transaction } from "./transaction.ts";

/**
 * Balance of an account derived from the ledger, as the user reads it:
 * money held for assets (negative = overdraft), money owed for liabilities.
 */
export function calculateAccountBalance(
  account: Account,
  transactions: readonly Transaction[],
): Money {
  const amounts = transactions.flatMap((transaction) =>
    transaction.postings
      .filter(({ target }) => target.kind === "ACCOUNT" && target.accountId === account.id)
      .map(({ amount }) => amount),
  );
  const ledgerBalance = sumMoney(amounts, account.currency);

  return getAccountNature(account.kind) === "ASSET" ? ledgerBalance : negateMoney(ledgerBalance);
}

export type IncomeAndExpense = Readonly<{ income: Money; expense: Money }>;

/**
 * Total income and expense in one currency, from category postings only.
 * Transfers, card payments and conversions have no category postings, so they
 * never count as income or expense (conversion fees do count as expense).
 */
export function summarizeIncomeAndExpense(
  transactions: readonly Transaction[],
  categories: readonly Category[],
  currency: Currency,
): IncomeAndExpense {
  const natureByCategoryId = new Map(categories.map((category) => [category.id, category.nature]));
  const incomeAmounts: Money[] = [];
  const expenseAmounts: Money[] = [];

  for (const { target, amount } of transactions.flatMap((transaction) => transaction.postings)) {
    if (target.kind !== "CATEGORY" || amount.currency !== currency) {
      continue;
    }
    const nature = natureByCategoryId.get(target.categoryId);
    if (nature === "INCOME") {
      incomeAmounts.push(negateMoney(amount));
    } else if (nature === "EXPENSE") {
      expenseAmounts.push(amount);
    }
  }

  return {
    income: sumMoney(incomeAmounts, currency),
    expense: sumMoney(expenseAmounts, currency),
  };
}
