# Contributing

Solvia is a personal project built in small, approved phases. Details live in
[docs/development.md](docs/development.md); this page is the short version.

## Setup

Requires Node.js 24 (`.nvmrc`) and [Gitleaks](https://github.com/gitleaks/gitleaks).

```sh
npm install            # installs every workspace and enables the Git hooks
cp .env.example .env   # optional; never commit .env
npm run check
```

See [Requirements and setup](docs/development.md#requirements) and the
[repository layout](docs/development.md#repository-layout).

## Workflow

1. Write or update the rule in [docs/business-rules.md](docs/business-rules.md) first.
2. Implement it in `@solvia/core` with tests next to the code (`*.test.ts`), then the outer layers.
3. Run `npm run check` after every step.
4. Record significant architecture decisions in [docs/adr/](docs/adr/).

Full workflow and conventions: [docs/development.md](docs/development.md#workflow).

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `test:`, `docs:`,
`refactor:`, `build:`, `ci:`, `chore:`. One logical step per commit; move files with `git mv` and
never mix a move with content edits.

## Definition of done

Implemented, tested, validated, handles errors, documented and breaks nothing: `npm run check`
passes locally and CI is green. Only fictitious data, and no new dependency without a documented reason.
