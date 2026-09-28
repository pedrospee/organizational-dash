import { Hono } from "hono";
import { errorHandler, notFoundHandler } from "./error-handler.ts";
import { healthRoutes } from "./routes/health.ts";

/**
 * Builds the HTTP application. Routes are chained so that `AppType` carries the
 * complete route types for `hono/client` (ADR-0003). Starting the server is
 * the job of main.ts, so tests call `app.request()` directly.
 */
export function createApp() {
  const app = new Hono().basePath("/api").route("/health", healthRoutes);

  app.onError(errorHandler);
  app.notFound(notFoundHandler);

  return app;
}

export type AppType = ReturnType<typeof createApp>;
