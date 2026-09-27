import { describe, expect, it } from "vitest";
import { DomainError } from "./domain-error.ts";
import { parseLocalDate } from "./local-date.ts";

describe("parseLocalDate", () => {
  it("accepts a real calendar date", () => {
    expect(parseLocalDate("2026-02-28")).toBe("2026-02-28");
    expect(parseLocalDate("2028-02-29")).toBe("2028-02-29");
  });

  it("rejects dates that do not exist", () => {
    expect(() => parseLocalDate("2026-02-29")).toThrow(DomainError);
    expect(() => parseLocalDate("2026-13-01")).toThrow(DomainError);
  });

  it("rejects values with time or another format", () => {
    expect(() => parseLocalDate("2026-09-26T10:00:00Z")).toThrow(DomainError);
    expect(() => parseLocalDate("26/09/2026")).toThrow(DomainError);
  });
});
