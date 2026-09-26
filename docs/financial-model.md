# Financial Model

Conceptual model approved on 2026-09-26. Field lists are indicative; each phase finalises
the entities it introduces.

## Core (Phase 1)

| Entity | Shape | Notes |
| --- | --- | --- |
| `Currency` | `EUR \| BRL` | |
| `Money` | `{ amountMinor: bigint, currency }` | `€10.50 → 1050n` |
| `ExchangeRate` | `{ baseCurrency, quoteCurrency, rate, effectiveDate, source, recordedAt }` | `rate` is a decimal string; `EUR/BRL 6.00` = 1 EUR is 6 BRL |
| `Account` | `{ id, name, institution, kind, currency, status, overdraftLimit?, creditLimit?, createdAt, updatedAt }` | Balance is derived, never stored as truth |
| `Category` | `{ id, name, nature: INCOME \| EXPENSE, parentId? }` | Categories are the income/expense side of the ledger |
| `Transaction` | `{ id, date, description, type, fxDetail?, createdAt, updatedAt }` | `date` is a local `YYYY-MM-DD` |
| `Posting` | `{ transactionId, accountId \| categoryId, amountMinor, currency }` | Postings sum to zero per currency |

Account kinds: `BANK`, `WISE`, `CASH`, `CREDIT_CARD`, `LOAN`, `FINANCING`, `INFORMAL_DEBT`,
`PERSONAL_DEBT`, `OTHER_LIABILITY`, `INVESTMENT`. Asset or liability nature is derived from the kind.

Transaction types (user-facing intent): `INCOME`, `EXPENSE`, `TRANSFER`, `CONVERSION`,
`CARD_PAYMENT`, `DEBT_PAYMENT`, `OPENING_BALANCE`, `ADJUSTMENT`.

## Posting examples

| Operation | Postings |
| --- | --- |
| Salary €2,500 | Bank +2,500 · Income:Salary −2,500 |
| Groceries €80 by debit | Expense:Food +80 · Bank −80 |
| Card purchase €500 | Expense:Food +500 · Credit Card −500 |
| Card payment €500 | Credit Card +500 · Bank −500 |
| Transfer €300 | Account B +300 · Account A −300 |
| Conversion €100 → R$600, fee €1 | EUR: Bank EUR −101 · FX +100 · Expense:Fees +1 — BRL: Wise BRL +600 · FX −600 |

Sign convention: positive increases assets and expenses; negative increases liabilities,
income and equity. The UI never shows these signs directly.

## Later phases

| Area | Entities |
| --- | --- |
| Debts (3) | `DebtTerms { creditor, originalAmount, interest info, minimumPayment, priority, dueDate, status }` → linked to a liability account |
| Credit cards (4) | `CreditCardTerms { closingDay, dueDay, creditLimit }`, `Statement`, `InstallmentPlan`, `Installment` |
| Planning (5) | `RecurrenceRule`, `PlannedItem { expectedDate, amount, status: PENDING \| MATCHED \| SKIPPED, matchedTransactionId }`, `Budget { month, categoryId, amount }` |
| Goals (7) | `FinancialGoal { name, type, targetAmount, currency, deadline, priority, status, linkedAccountId? }`, `GoalAllocation` |
| Analytics (8) | `FinancialSnapshot { month, assets, liabilities, netWorth, ratesUsed }` |
| Investments (10) | Investment account + `Valuation { date, value }` |

The monthly plan is derived from planned items and budgets; it is not a separate entity.

## Key formulas

```text
Net worth        = Assets − Liabilities                        (reporting currency, current rates)
Cash flow        = Opening cash + Income − Expenses paid − Debt payments − Investment contributions
                   (internal transfers and conversions excluded)
Debt progress %  = (Original amount − Current balance) / Original amount
Available to Spend (estimate) = Available cash − Upcoming obligations − Planned debt payments
                                − Required goal contributions − Minimum reserve
```

Consumption (budget, recognised at purchase / per installment) and cash (cash flow,
recognised when money leaves the bank) are separate views and are never added together.
