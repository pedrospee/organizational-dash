import { describe, expect, it } from "vitest";
import { createApp } from "./app.ts";

describe("GET /api/health", () => {
  it("reports that the API is up", async () => {
    const response = await createApp().request("/api/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});

describe("unknown routes", () => {
  it("return 404 with the standard error shape", async () => {
    const response = await createApp().request("/api/nothing-here");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "ROUTE_NOT_FOUND", message: "No route for GET /api/nothing-here." },
    });
  });
});
