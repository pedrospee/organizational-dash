# Business Rules

Every approved financial rule, with the phase that implements it. A rule is ✅ only when automated tests cover it; the test file is listed.

## General

| ID | Rule | Status |
| --- | --- | --- |
| BR-01 | The system informs and simulates; it never makes financial decisions. Debt, cash flow, liquidity, future commitments and payment capacity are priority metrics. | Principle |
| BR-02 | A ledger transaction is always something that happened. Planned items never count as actual. | ✅ Structural (ledger has no "planned" state) · planning in Phase 5 |
| BR-03 | Every transaction keeps the ledger balanced; invalid transactions are rejected. | ✅ `transaction-validation.test.ts` |
| BR-04 | Values that can be either real or calculated are labelled **Actual** or **Estimated**. | Phase 3+ |
| BR-05 | Only fictitious data in code, seeds and tests. | ✅ `test-fixtures.ts` |

## Money and currencies

| ID | Rule | Status |
| --- | --- | --- |
| BR-10 | Money is integer minor units (`bigint`) plus currency. No floating point. | ✅ `money.test.ts` |
| BR-11 | EUR and BRL are both native; BRL is never permanently converted to EUR. | ✅ `exchange-rate.test.ts` |
| BR-12 | Reporting currency is EUR (net worth, dashboard, projections), configurable later. | Phase 8 |
| BR-13 | `EUR/BRL = 6.00` means `1 EUR = 6 BRL`, everywhere. | ✅ `exchange-rate.test.ts` |
| BR-14 | Division is deterministic; the remainder goes explicitly to the last parts: €1,000 / 3 = 333.33 + 333.33 + 333.34. Conversions round half away from zero. | ✅ `money.test.ts`, `decimal.test.ts` |
| BR-15 | Same-currency transactions store one currency only. A rate is stored only for real cross-currency operations (conversion, foreign purchase). | ✅ `transaction-validation.test.ts`, `financial-scenarios.test.ts` |
| BR-16 | In a real conversion, the actual amounts of both legs are the truth; the executed rate is derived from them. Fees are recorded separately. | ✅ `financial-scenarios.test.ts` |
| BR-17 | Current reports use the rate in force today; historical analysis uses the rate in force on that date. The original amount is never replaced. | ✅ `exchange-rate-history.test.ts` |
| BR-18 | A conversion is neither income nor expense (its fee is an expense). | ✅ `financial-scenarios.test.ts` |
| BR-19 | Value changes caused only by rate movements are an **FX effect**, never income or expense. Analytics separate cash flow, operating result, FX effect and investment performance. | Mechanism ✅ `exchange-rate-history.test.ts` · reporting Phase 8 |

## Accounts and transfers

| ID | Rule | Status |
| --- | --- | --- |
| BR-20 | Balances are derived from the ledger, starting from an opening-balance transaction. | ✅ `financial-scenarios.test.ts` |
| BR-21 | An internal transfer changes balances with zero income, zero expense and unchanged total. Transfers are only between own asset accounts in the same currency. | ✅ `financial-scenarios.test.ts`, `transaction-validation.test.ts` |
| BR-22 | Overdraft is a negative balance of the bank account itself, with a limit; no separate liability. Only `BANK` accounts may have an `overdraftLimit`: in the account's currency, greater than zero; absent means no limit. Derived: `used = max(0, −balance)`, `remaining = max(0, limit − used)`, `exceeded = max(0, used − limit)`, `availableIncludingOverdraft = max(0, balance + limit)` (not BR-65's Available to Spend). Without a limit the derived values are null. The limit never blocks the ledger: going beyond it is recorded and shows as `exceeded`. | ✅ `overdraft.test.ts`, `financial-scenarios.test.ts` |
| BR-23 | Free editing of past transactions in the MVP (`createdAt`, `updatedAt`); edits must keep the ledger balanced and derived values are recalculated. | Phase 2 |

## Categories

| ID | Rule | Status |
| --- | --- | --- |
| BR-70 | A child category has the same `nature` (`INCOME` or `EXPENSE`) as its parent. | ✅ `category.test.ts` |
| BR-71 | Categories have at most two levels, parent → child. A parent is a top-level category, so a category with children cannot become a child. The whole resulting tree is validated, never a change in isolation. | ✅ `category.test.ts` |

A posting may target a parent category directly, even when it has children. How reports aggregate
a parent with its children is decided with analytics (Phase 8); no posting is ever counted twice
because of the hierarchy (`category.test.ts`).

## Debts

| ID | Rule | Status |
| --- | --- | --- |
| BR-30 | Every obligation is a liability account. `DebtTerms` describe it and never hold a second balance. | Liability accounts ✅ · terms in Phase 3 |
| BR-31 | All debt types (credit card, overdraft, loan, financing, informal, personal, other) share behaviour driven by account nature and terms. | ✅ `getAccountNature` · terms in Phase 3 |
| BR-32 | Persisted statuses: `ACTIVE`, `RENEGOTIATED`, `CANCELLED`, `PAID_OFF`. Overdue, progress and % paid are derived. | Phase 3 |
| BR-33 | A payment decreases cash and the liability, and never creates a second expense. | ✅ card payments · debt payments in Phase 3 |
| BR-34 | Interest is reconciled from statements (`previous + interest + charges − payment = current`), not computed in the ledger. Calculated interest is only for simulations. | Phase 3, 6 |

## Credit cards

| ID | Rule | Status |
| --- | --- | --- |
| BR-40 | A card purchase creates a liability; the bank balance is unchanged. | ✅ `financial-scenarios.test.ts` |
| BR-41 | Installments: the budget gets the installment amount each month; the committed limit and the liability equal the total still unpaid; the schedule controls due dates. | Phase 4 |
| BR-42 | A purchase belongs to the statement whose period contains its date; a purchase on the closing day belongs to the statement being closed. Configurable per card later. | Phase 4 |
| BR-43 | Financial periods use local dates (`YYYY-MM-DD`), never time or time zone. | ✅ `local-date.test.ts` |

## Goals

| ID | Rule | Status |
| --- | --- | --- |
| BR-50 | A goal is a virtual allocation by default. It may be linked to an account without duplicating money. Physical money and virtual allocations are distinguished. | Phase 7 |

## Future-ready

The ledger must support these without structural change.

| ID | Rule | Status |
| --- | --- | --- |
| BR-60 | Refund: economically reverses the original expense. | Later |
| BR-61 | Reversal: corrects an operation without deleting history. | Later |
| BR-62 | Cashback: an inflow, not a silent reduction of the original expense. | Later |
| BR-63 | Split transaction: several categories summing exactly to the total. | Supported by postings · UI later |
| BR-64 | Reconciliation: compare system and bank balances and record an explicit adjustment; never correct silently. | After MVP |
| BR-65 | **Available to Spend** = available cash − upcoming obligations − planned debt payments − required goal contributions − minimum reserve. Always an estimate with its assumptions; never called "safe". | Phase 8–9 |
| BR-66 | Monthly snapshots are historical photographs for analytics; they never replace the ledger. | Phase 8 |
| BR-67 | Scenarios are simulations and never change real data. | Phase 6+ |
