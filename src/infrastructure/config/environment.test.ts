import { describe, expect, it } from "vitest";
import { InvalidEnvironmentError, loadEnvironment } from "./environment.ts";

describe("loadEnvironment", () => {
  it("defaults NODE_ENV to development when it is not set", () => {
    expect(loadEnvironment({})).toEqual({ NODE_ENV: "development" });
  });

  it("accepts a supported NODE_ENV", () => {
    expect(loadEnvironment({ NODE_ENV: "production" })).toEqual({ NODE_ENV: "production" });
  });

  it("rejects an unsupported NODE_ENV", () => {
    expect(() => loadEnvironment({ NODE_ENV: "staging" })).toThrow(InvalidEnvironmentError);
  });
});
