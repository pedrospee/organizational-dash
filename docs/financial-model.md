# Financial Model

What is implemented in `packages/core/src/` (`@solvia/core`, Phase 1) and what later phases add.

## Implemented (Phase 1)

| Entity | Shape | Notes |
| --- | --- | --- |
| `Currency` | `"EUR" \| "BRL"` | 2 minor-unit digits each |
| `Money` | `{ amountMinor: bigint, currency }` | `€10.50 → 1050n`; parse with `moneyFromDecimal("10.50", "EUR")` |
| `LocalDate` | `"YYYY-MM-DD"` | Validated calendar date, no time zone |
| `ExchangeRate` | `{ baseCurrency, quoteCurrency, rate, effectiveDate, source, recordedAt }` | `rate` is an exact decimal string; `source` is `MANUAL` or `TRANSACTION` |
| `Account` | `{ id, name, institution?, kind, currency, overdraftLimit? }` | Nature (asset/liability) derived from `kind`; `overdraftLimit` only on `BANK` (BR-22) |
| `Category` | `{ id, name, nature: INCOME \| EXPENSE, parentId? }` | Currency-agnostic; at most two levels, a child shares its parent's nature (BR-70, BR-71) |
| `Transaction` | `{ id, date, description, type, postings, exchangeRate? }` | `exchangeRate` only when two currencies are involved |
| `Posting` | `{ target, amount }` | `target` is an account, a category or a system role |

**Account kinds** — assets: `BANK`, `WISE`, `CASH`, `INVESTMENT`; liabilities: `CREDIT_CARD`, `LOAN`, `FINANCING`, `INFORMAL_DEBT`, `PERSONAL_DEBT`, `OTHER_LIABILITY`.

**Transaction types** — `OPENING_BALANCE`, `INCOME`, `EXPENSE`, `TRANSFER`, `CARD_PAYMENT`, `CONVERSION`. `DEBT_PAYMENT` arrives in Phase 3 and `ADJUSTMENT` with reconciliation.

**System posting roles** — `OPENING_BALANCE_EQUITY` (other side of a starting balance) and `EXCHANGE_CLEARING` (bridges the two currencies of an operation).

## Postings

Internal sign convention, never shown to users: positive increases assets and expenses; negative increases liabilities and income.

| Operation | Factory | Postings |
| --- | --- | --- |
| Opening balance €1,000 | `createOpeningBalanceTransaction` | Bank +1,000 · Equity −1,000 |
| Salary €2,500 | `createIncomeTransaction` | Bank +2,500 · Salary −2,500 |
| Card purchase €500 | `createExpenseTransaction` | Food +500 · Card −500 |
| Card payment €500 | `createCardPaymentTransaction` | Card +500 · Bank −500 |
| Transfer €300 | `createTransferTransaction` | B +300 · A −300 |
| €100 → R$600, fee €1 | `createConversionTransaction` | **EUR:** Bank −101 · Clearing +100 · Fees +1 — **BRL:** Clearing −600 · Wise BRL +600 |
| R$120 dinner charged €20.40 on card | `createExpenseTransaction` + `foreignCharge` | **BRL:** Food +120 · Clearing −120 — **EUR:** Clearing +20.40 · Card −20.40 |

The foreign purchase keeps the expense in its original BRL and the debt in the EUR actually charged; the executed rate (5.882353) is stored.

## Validation (`assertValidTransaction`)

1. Non-empty id and description; at least 2 postings; no zero amounts.
2. Every referenced account and category exists; account postings use the account's currency.
3. Postings sum to zero in each currency.
4. One currency: no exchange data. Two currencies: the rate used plus a clearing posting in each currency.
5. Expense categories only move positive, income categories only negative.
6. Type rules: income only into assets; transfers only between two distinct asset accounts, no categories; card payments reduce a credit card from asset accounts; conversions involve two currencies, asset accounts only, fees as expense; the opening-balance posting only in opening balances.

## Balances and summaries

- `calculateAccountBalance(account, transactions)` — the balance as the user reads it: money held for assets (negative = overdraft), money owed for liabilities.
- `calculateOverdraft(account, transactions)` — BR-22: `limit`, `used`, `remaining`, `exceeded` and `availableIncludingOverdraft`, derived from the balance; `null` for an account without a limit.
- `assertValidCategoryHierarchy(categories)` — BR-70, BR-71: validates the whole tree as it would be after a change (parents exist, same nature, at most two levels).
- `summarizeIncomeAndExpense(transactions, categories, currency)` — totals from category postings only, so transfers, card payments and conversions never count.
- `convertMoneyOnDate(money, currency, rates, date)` — values an amount with the rate in force on a date (current or historical).

## Later phases

| Area | Entities |
| --- | --- |
| Persistence (2) | `createdAt`/`updatedAt` and account `archivedAt`, stored by the backend only (see below) |
| Debts (3) | `DebtTerms { creditor, originalAmount, interest, minimumPayment, priority, dueDate, status }` on a liability account |
| Credit cards (4) | `CreditCardTerms { closingDay, dueDay, creditLimit }`, `Statement`, `InstallmentPlan`, `Installment` |
| Planning (5) | `RecurrenceRule`, `PlannedItem { expectedDate, amount, status, matchedTransactionId }`, `Budget { month, categoryId, amount }` |
| Goals (7) | `FinancialGoal { name, type, targetAmount, currency, deadline, priority, status, linkedAccountId? }`, `GoalAllocation` |
| Analytics (8) | `FinancialSnapshot { month, assets, liabilities, netWorth, ratesUsed }` |
| Investments (10) | Investment account + `Valuation { date, value }` |

## Account lifecycle (backend, not core)

Archiving is a lifecycle change, not a change to the financial reality recorded in the ledger, so the
core `Account` has no status. The backend stores `archivedAt` (and `createdAt`, `updatedAt`):

- An archived account keeps its history, and its balance still counts in net worth, obligations and
  reports. It can be archived with any balance, positive or negative.
- It is left out of the default account list, and cannot receive new transactions (Phase 2B, slice 5).
- Archiving is reversible (unarchive).
- An account without postings can be deleted; one with postings cannot (`ACCOUNT_IN_USE`, enforced
  once postings are persisted in slice 5) and is archived instead.
- `kind` and `currency` never change after creation; `name`, `institution` and `overdraftLimit` can.

## Key formulas

```text
Net worth         = Assets − Liabilities                    (reporting currency, current rates)
Cash flow         = Opening cash + Income − Expenses paid − Debt payments − Investment contributions
                    (transfers and conversions excluded)
Debt progress %   = (Original amount − Current balance) / Original amount
Available to Spend (estimate) = Available cash − Upcoming obligations − Planned debt payments
                                − Required goal contributions − Minimum reserve
```

Consumption (budget: at purchase or per installment) and cash (cash flow: when money leaves the bank) are separate views and are never added together.
