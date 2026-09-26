# Development

## Requirements

- Node.js 24 LTS (`.nvmrc`). With nvm: `nvm use`. With Homebrew: `brew install node@24`
  and put `$(brew --prefix node@24)/bin` first on `PATH`.
- Gitleaks (`brew install gitleaks`) — required by the pre-commit hook.

## Setup

```sh
npm install            # also enables the Git hooks (core.hooksPath = .githooks)
cp .env.example .env   # optional; adjust locally, never commit
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Runs `src/main.ts` directly with Node type stripping, restarting on change |
| `npm run build` | Compiles `src/` to `dist/` (tests excluded) |
| `npm start` | Runs the compiled app |
| `npm run typecheck` | Type-checks without emitting |
| `npm run lint` | Biome: lint, formatting and import order |
| `npm run lint:fix` | Applies safe Biome fixes and formatting |
| `npm test` | Runs Vitest once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run check` | typecheck + lint + test — run before every commit |
| `npm run secrets:scan` | Gitleaks scan of the whole Git history |

## TypeScript conventions

- Code, identifiers and file names in English.
- Relative imports use the `.ts` extension (`./environment.ts`); the build rewrites them to `.js`.
- Only erasable TypeScript syntax (`erasableSyntaxOnly`): no `enum`, `namespace` or parameter
  properties. Use `as const` objects and union types instead.
- Type-only imports use `import type` (`verbatimModuleSyntax`).
- Money is never a `number`; see [business-rules.md](business-rules.md).

## Workflow

1. Understand the problem and rules → define entities and use cases.
2. Implement domain rules with tests first; then application, infrastructure, UI.
3. `npm run check` must pass.
4. Document new financial rules in `docs/business-rules.md`.
5. Small conventional commits: `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`.

A feature is done only when it is implemented, tested, validated, handles errors, is
documented where needed, and does not break existing behaviour.
