import type { ExchangeRate } from "../exchange/exchange-rate.ts";
import type { LocalDate } from "../local-date.ts";
import type { Money } from "../money/money.ts";

/** What the user did, in human terms. The postings carry the accounting. */
export const TRANSACTION_TYPES = [
  "OPENING_BALANCE",
  "INCOME",
  "EXPENSE",
  "TRANSFER",
  "CARD_PAYMENT",
  "CONVERSION",
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/**
 * Internal counterparts that are neither user accounts nor categories.
 * OPENING_BALANCE_EQUITY: the other side of a starting balance.
 * EXCHANGE_CLEARING: bridges the two currencies of a cross-currency operation.
 */
export type SystemPostingRole = "OPENING_BALANCE_EQUITY" | "EXCHANGE_CLEARING";

export type PostingTarget =
  | Readonly<{ kind: "ACCOUNT"; accountId: string }>
  | Readonly<{ kind: "CATEGORY"; categoryId: string }>
  | Readonly<{ kind: "SYSTEM"; role: SystemPostingRole }>;

/**
 * One line of a transaction. Sign convention (internal only, never shown to users):
 * positive increases assets and expenses; negative increases liabilities and income.
 */
export type Posting = Readonly<{ target: PostingTarget; amount: Money }>;

/**
 * Something that actually happened. Its postings sum to zero in each currency.
 * `exchangeRate` exists only when the transaction involves two currencies.
 */
export type Transaction = Readonly<{
  id: string;
  date: LocalDate;
  description: string;
  type: TransactionType;
  postings: readonly Posting[];
  exchangeRate?: ExchangeRate;
}>;
