# Security

## Deployment assumption

- Single user, **localhost only**. The HTTP server (Phase 2) listens on `127.0.0.1` only.
- **No authentication** in this configuration. This is an explicit, documented assumption.
- If the application is ever exposed on a network, or becomes multi-user/SaaS,
  authentication and authorization become mandatory before that change ships.

## Data

- Only fictitious data in the repository: seed data, mocks and test fixtures.
- The real SQLite database lives **outside the repository**, at the path set in `.env`
  (`DATABASE_PATH`, introduced in Phase 2).
- Real data is entered only after persistence and backup exist (Phase 2).
- The database file is not encrypted by the application. Disk encryption (FileVault on
  macOS) must be enabled. SQLCipher may be evaluated in Phase 12.

## Never in the code or in Git

Passwords, bank credentials, API keys, tokens, IBANs, card numbers, CVVs, real statements,
real database files, backups or exports.

## Controls

| Control | Where |
| --- | --- |
| `.gitignore` blocks `.env*` (except `.env.example`), databases, `data/`, `personal-data/`, `financial-data/`, `backups/`, `exports/`, `logs/` | `.gitignore` |
| Placeholder-only environment template | `.env.example` |
| Environment validated at startup; the app refuses to start on invalid config | `src/infrastructure/config/environment.ts` |
| Gitleaks scans staged changes before every commit; the commit is blocked if Gitleaks is missing | `.githooks/pre-commit`, enabled by `npm install` |
| Full-history scan on demand | `npm run secrets:scan` |
| GitHub secret scanning + push protection | Enable when the remote repository is created |

## Backups (Phase 2)

Manual backup, export, restore, and an automatic backup before every migration.
Backups are stored outside the repository.
