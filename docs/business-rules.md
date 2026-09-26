# Business Rules

Approved rules. Each rule must be covered by automated tests when it is implemented.
The phase in brackets is where the rule is first implemented.

## General

- **BR-01** The system informs and simulates. It never makes financial decisions automatically.
  Debt, cash flow, liquidity, future commitments and payment capacity are priority metrics.
- **BR-02** A ledger transaction always represents something that happened. Planned items
  never count as actual. [1, 5]
- **BR-03** Every transaction must keep the ledger balanced. Unbalanced or otherwise invalid
  transactions are rejected. [1]
- **BR-04** Values shown to the user are labelled **Actual** or **Estimated** whenever both
  can appear. [3+]
- **BR-05** Only fictitious data is used during development, in seed data and in tests.

## Money and currencies

- **BR-10** Money is stored as integer minor units with its currency. No floating point. [1]
- **BR-11** Supported currencies: EUR and BRL. BRL is a native currency and is never
  permanently converted to EUR. [1]
- **BR-12** Reporting currency: EUR by default (net worth, dashboard, projections, global
  indicators). Designed to be configurable later. [1]
- **BR-13** Rate convention: `EUR/BRL = 6.00` means `1 EUR = 6 BRL`, everywhere. [1]
- **BR-14** Division is deterministic. The rounding remainder is distributed explicitly;
  `€1,000 / 3 = €333.33 + €333.33 + €333.34` (remainder on the last part). [1]
- **BR-15** A same-currency transaction stores only its own currency. An exchange rate is
  stored only for real cross-currency operations (EUR → BRL, BRL → EUR, BRL purchase paid
  from a EUR account). [1]
- **BR-16** For a real conversion where both legs are known, the actual leg amounts take
  precedence over a recalculated rate. Fees are recorded separately. [1]
- **BR-17** Current reports use the rate for the moment of the query; historical analysis
  uses the historical rate for the date. The original transaction amount is never replaced. [1, 8]
- **BR-18** A conversion is neither income nor expense. [1]
- **BR-19** Changes in reporting-currency value caused only by rate movements are an
  **FX effect**, never income or expense. Analytics separate cash flow, operational result,
  FX effect and investment performance where relevant. [8]

## Accounts and transfers

- **BR-20** Balances are derived from the ledger, starting from an opening-balance entry. [1]
- **BR-21** An internal transfer changes account balances but produces zero income, zero
  expense and no change in net worth. [1]
- **BR-22** Overdraft is a negative balance of the bank account itself, with an overdraft
  limit. No separate liability account. The system derives used overdraft, available
  overdraft and remaining limit. [2]
- **BR-23** Free editing of past transactions is allowed in the MVP (`createdAt`,
  `updatedAt`). Edits must keep the ledger balanced and derived values are recalculated. [2]

## Debts

- **BR-30** Every obligation is a liability account. `DebtTerms` (creditor, original
  amount, interest information, minimum payment, priority, due date) describe it; they
  never hold a second balance. [3]
- **BR-31** Debt types share one behaviour driven by liability nature and terms: credit
  card, overdraft, bank loan, financing, informal debt, personal debt, other liability. [3]
- **BR-32** Persisted debt statuses: `ACTIVE`, `RENEGOTIATED`, `CANCELLED`, `PAID_OFF`.
  Overdue, progress and percentage paid are derived. [3]
- **BR-33** A debt payment decreases cash and decreases the liability. It never creates a
  second expense for an already recorded obligation. [3]
- **BR-34** Interest is reconciled from statements, not computed in the ledger:
  `previous balance + interest + charges − payment = current balance`. Observed interest
  may be recorded separately. Mathematical interest is used only in simulators,
  projections and scenarios. [3, 6]

## Credit cards

- **BR-40** A card purchase creates a liability; it does not reduce the bank balance. [2, 4]
- **BR-41** Installment purchases: the budget receives the installment amount per month;
  the committed limit and the liability equal the total amount still unpaid; the
  installment schedule controls due dates. Limit is released as installments are paid. [4]
- **BR-42** A purchase belongs to the statement whose closing period contains the purchase
  date. A purchase on the closing day belongs to the statement being closed. Configurable
  per card later. [4]
- **BR-43** Financial periods use local dates (`YYYY-MM-DD`), never time or time zone. [1]

## Goals

- **BR-50** A goal is by default a **virtual allocation** of existing money, not a transfer.
  A goal may be linked to an account; the link never duplicates money. The system
  distinguishes physical money from virtual allocations. [7]

## Future-ready rules

These are not in the MVP, but the ledger must support them without structural changes.

- **BR-60** Refund: economically reverses the original expense.
- **BR-61** Reversal: corrects an operation without deleting financial history.
- **BR-62** Cashback: recorded as an inflow, not as a silent reduction of the original expense.
- **BR-63** Split transaction: one transaction, several categories; category amounts sum
  exactly to the transaction amount.
- **BR-64** Reconciliation: compare system balance with actual bank balance and record an
  explicit adjustment for any difference. Never correct a balance silently.
- **BR-65** "Available to Spend" = current available cash − upcoming obligations − planned
  debt payments − required goal contributions − minimum reserve. Always shown as an
  estimate, with its assumptions. Never labelled "safe".
- **BR-66** Monthly snapshots are historical photographs for analytics. They never replace
  the ledger.
- **BR-67** Scenarios are simulations and never change real data.
