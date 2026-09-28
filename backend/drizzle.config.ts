import { defineConfig } from "drizzle-kit";

// Used only by `npm run db:generate`. Committed migrations are never edited:
// a schema change always produces a new migration.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/infrastructure/database/schema/index.ts",
  out: "./src/infrastructure/database/migrations",
});
