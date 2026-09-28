// Type-only entry point for the Phase 2C UI: `import type { AppType } from "@solvia/backend/rpc"`.
// It must stay type-only, so importing it never loads backend runtime code (ADR-0003).
export type { AppType } from "./app.ts";
