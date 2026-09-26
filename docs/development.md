# Development

## Requirements

- **Node.js 24 LTS** (`.nvmrc`). With nvm: `nvm use`. With Homebrew: `brew install node@24`, then put `/opt/homebrew/opt/node@24/bin` first on `PATH` (or `brew link --overwrite node@24`).
- **Gitleaks** (`brew install gitleaks`): the pre-commit hook blocks commits without it.

## Setup

```sh
npm install            # also enables the Git hooks (core.hooksPath = .githooks)
cp .env.example .env   # optional; never commit .env
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run check` | typecheck + lint + tests — **run before every commit** |
| `npm test` / `npm run test:watch` | Vitest once / in watch mode |
| `npm run lint` / `npm run lint:fix` | Biome check / apply safe fixes and formatting |
| `npm run typecheck` | TypeScript without emitting |
| `npm run dev` | Runs `src/main.ts` directly, restarting on change |
| `npm run build` / `npm start` | Compile to `dist/` / run the compiled app |
| `npm run secrets:scan` | Gitleaks scan of the whole Git history |

## Conventions

- Code, identifiers, files and docs in English.
- Relative imports use the `.ts` extension; the build rewrites them to `.js`.
- Erasable TypeScript only: no `enum`, `namespace` or parameter properties. Use `as const` arrays and union types.
- `import type` for type-only imports.
- Money is never a `number`. Parse user amounts with `moneyFromDecimal`.
- Domain failures throw `DomainError` with a stable `code`.
- Tests live next to the code (`*.test.ts`); reference the rule ID (`BR-xx`) in the `describe` name when a test covers a business rule.
- Test data comes from fictitious fixtures (`test-fixtures.ts`) and is excluded from the build.

## Workflow

1. Understand the problem → write the rule in [business-rules.md](business-rules.md).
2. Implement the core rule with tests; then application, infrastructure and UI.
3. `npm run check` passes.
4. Mark the rule ✅ with its test file.
5. Small conventional commits: `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`.

A feature is done when it is implemented, tested, validated, handles errors, is documented and breaks nothing.
