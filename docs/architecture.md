# Architecture

Status: approved on 2026-09-26. Phase 0 (foundation) implemented.

## Goals

Personal Finance Manager is a single-user financial planning system for EUR and BRL.
It keeps three concerns strictly apart:

| Layer | Question it answers | Examples |
| --- | --- | --- |
| **Ledger** | What actually happened? | Salary received, rent paid, transfer, debt payment |
| **Planning** | What is expected to happen? | Expected salary, future installment, planned trip |
| **Analytics** | What does it mean? | Net worth, cash flow, debt evolution, projections |

A ledger transaction is always a fact. Planned items live in the planning layer and are
*matched* to real transactions when they happen.

## Style

Modular monolith with a pure financial core.

```text
domain (pure rules)  ←  application (use cases)  ←  infrastructure (DB) / http (API) / web (UI)
```

- **domain** — pure TypeScript. No database, HTTP, React, Hono or external APIs.
  All important financial rules live here and are unit-tested.
- **application** — use cases that orchestrate domain rules and repositories.
- **infrastructure** — SQLite access (Drizzle), configuration, backups.
- **http** — thin Hono routes; no business rules.
- **web** — React + Vite UI (introduced when the first UI is needed).

Dependencies point inward only. The domain never imports from outer layers.

## Ledger model: internal double-entry

Every transaction produces two or more postings whose amounts sum to zero **per currency**.

```text
Card purchase €500      Expense:Food   +500   |  Credit Card   −500
Card statement payment  Credit Card    +500   |  Bank Account  −500
Internal transfer €300  Account B      +300   |  Account A     −300
```

- Income and expense exist only when one side of the transaction is a category.
  An internal transfer therefore never creates income or expense.
- Cross-currency operations balance each currency separately through an internal
  exchange account; fees are a separate posting (`Expense:Fees`).
- **Users never see debit/credit.** The UI speaks in human terms: income, expense,
  transfer, purchase, payment, debt, conversion, investment.

See [financial-model.md](financial-model.md) for entities and
[business-rules.md](business-rules.md) for the rules.

## Repository structure

Folders are created only when a phase needs them.

```text
src/
├── core/              (Phase 1) money, currency, exchange-rate, ledger — pure, shared
├── modules/<feature>/ (Phase 2+) <feature>.domain.ts · .service.ts · .repository.ts · tests
├── infrastructure/
│   └── config/        environment loading and validation
├── http/              (Phase 2) thin routes
└── main.ts            application bootstrap
docs/                  architecture and rules
```

Tests live next to the code they test (`*.test.ts`). Fixtures contain fictitious data only.

## Stack

| Area | Choice | Reason |
| --- | --- | --- |
| Runtime | Node.js 24 LTS (`.nvmrc`) | Long-term support |
| Package manager | npm | Already available; single package |
| Language | TypeScript, `strict` + `noUncheckedIndexedAccess` | Catch errors at compile time |
| Execution | Node native type stripping (`node src/main.ts`) | No extra runner dependency |
| Money | Integer minor units (`bigint`) | Never floating point |
| Database | SQLite (local file) | Zero infrastructure, file-level backup, ACID |
| ORM | Drizzle + better-sqlite3 | Typed, close to SQL, versioned migrations |
| Validation | Zod | Validates external input, derives types |
| Tests | Vitest | Fast, native TypeScript |
| Lint / format | Biome | One tool instead of ESLint + Prettier |
| API | Hono on `127.0.0.1` | Small, typed RPC client |
| Frontend | React + Vite | Deferred until the first UI |
| Secrets | `.env`, Gitleaks pre-commit hook, GitHub push protection | See [security.md](security.md) |

No other framework or library is added without an explicit, documented justification.

## Roadmap

| Phase | Scope |
| --- | --- |
| 0 | Foundation |
| 1 | Financial core: Currency, Money, ExchangeRate (manual), ledger, Account, Category |
| 2 | Persistence, accounts, transactions, manual rates, backup/export, minimal UI |
| 3 | Debt management |
| 4 | Credit cards (statements, installments) |
| 5 | Planning + budget |
| 6 | Debt payoff simulator (avalanche / snowball) |
| 7 | Financial goals |
| 8 | Analytics, snapshots, projections |
| 9 | Dashboard |
| 10 | Investments |
| 11 | Automatic exchange rates, CSV/OFX import, Wise |
| 12 | Advanced security and audit |

After the MVP (phases 0–3): **reconciliation**, then **CSV import** (preview, validation,
column mapping, duplicate detection, confirmation, idempotent re-import).

Each phase has a limited scope, has tests, and is reviewed before the next one starts.
