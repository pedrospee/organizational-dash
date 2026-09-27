import { describe, expect, it } from "vitest";
import { divideRoundingHalfAwayFromZero, formatDecimal, parseDecimal } from "./decimal.ts";
import { DomainError } from "./domain-error.ts";

describe("parseDecimal", () => {
  it("parses integers and fractions exactly", () => {
    expect(parseDecimal("6")).toEqual({ coefficient: 6n, scale: 0 });
    expect(parseDecimal("6.25")).toEqual({ coefficient: 625n, scale: 2 });
    expect(parseDecimal("-0.05")).toEqual({ coefficient: -5n, scale: 2 });
  });

  it("rejects anything that is not a plain decimal", () => {
    for (const invalid of ["", "1,50", "1e3", ".5", "5.", "abc"]) {
      expect(() => parseDecimal(invalid)).toThrow(DomainError);
    }
  });
});

describe("formatDecimal", () => {
  it("round-trips parsed values", () => {
    for (const value of ["6", "6.25", "-0.05", "0.000001"]) {
      expect(formatDecimal(parseDecimal(value))).toBe(value);
    }
  });
});

describe("divideRoundingHalfAwayFromZero", () => {
  it("rounds ties away from zero", () => {
    expect(divideRoundingHalfAwayFromZero(5n, 2n)).toBe(3n);
    expect(divideRoundingHalfAwayFromZero(-5n, 2n)).toBe(-3n);
  });

  it("rounds to the nearest integer otherwise", () => {
    expect(divideRoundingHalfAwayFromZero(7n, 3n)).toBe(2n);
    expect(divideRoundingHalfAwayFromZero(8n, 3n)).toBe(3n);
    expect(divideRoundingHalfAwayFromZero(-8n, 3n)).toBe(-3n);
  });
});
