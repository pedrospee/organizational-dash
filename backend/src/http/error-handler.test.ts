import { DomainError } from "@solvia/core";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "../modules/errors.ts";
import { ApiError, errorHandler } from "./error-handler.ts";

function appThrowing(error: unknown) {
  const app = new Hono()
    .get("/fail", () => {
      throw error;
    })
    .post(
      "/json",
      validator("json", (value) => value),
      (c) => c.json(c.req.valid("json")),
    );
  app.onError(errorHandler);
  return app;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("errorHandler", () => {
  it("maps an ApiError to its status, code and details", async () => {
    const error = new ApiError(409, "ACCOUNT_IN_USE", "The account has postings.", {
      accountId: "fictitious-account",
    });

    const response = await appThrowing(error).request("/fail");

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: "ACCOUNT_IN_USE",
        message: "The account has postings.",
        details: { accountId: "fictitious-account" },
      },
    });
  });

  it("maps a NotFoundError to 404 with its code", async () => {
    const error = new NotFoundError("ACCOUNT_NOT_FOUND", 'No account with id "x".');

    const response = await appThrowing(error).request("/fail");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "ACCOUNT_NOT_FOUND", message: 'No account with id "x".' },
    });
  });

  it("maps a ConflictError to 409 with its code", async () => {
    const error = new ConflictError("CATEGORY_HAS_CHILDREN", "It has children.");

    const response = await appThrowing(error).request("/fail");

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: { code: "CATEGORY_HAS_CHILDREN", message: "It has children." },
    });
  });

  it("maps a DomainError to 422 with its stable code", async () => {
    const error = new DomainError("UNBALANCED_TRANSACTION", "EUR postings sum to 1.00.");

    const response = await appThrowing(error).request("/fail");

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: { code: "UNBALANCED_TRANSACTION", message: "EUR postings sum to 1.00." },
    });
  });

  it("maps a malformed JSON body to 400", async () => {
    const response = await appThrowing(undefined).request("/json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not json",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "INVALID_REQUEST" } });
  });

  it("maps any other error to a generic 500 and logs the real error", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("SQLITE_ERROR near /Users/someone/solvia.db: secret detail");

    const response = await appThrowing(error).request("/fail");
    const body = JSON.stringify(await response.json());

    expect(response.status).toBe(500);
    expect(JSON.parse(body)).toEqual({
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." },
    });
    expect(body).not.toContain("SQLITE");
    expect(body).not.toContain("/Users");
    expect(logged).toHaveBeenCalledWith(error);
  });
});
