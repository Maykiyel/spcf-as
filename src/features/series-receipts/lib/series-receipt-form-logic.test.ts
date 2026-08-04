import { describe, it, expect } from "vitest";
import {
  computeToFromSheets,
  computeSheetsFromTo,
  buildCreatePayload,
  isStaleFromError,
} from "./series-receipt-form-logic";

describe("computeToFromSheets", () => {
  it("computes the ending number from a sheet count", () => {
    expect(computeToFromSheets(123, 78)).toBe(200);
  });

  it("a single sheet ends on the same number it starts", () => {
    expect(computeToFromSheets(1, 1)).toBe(1);
  });
});

describe("computeSheetsFromTo", () => {
  it("computes the sheet count from an ending number", () => {
    expect(computeSheetsFromTo(123, 200)).toBe(78);
  });

  it("a range of one number is a single sheet", () => {
    expect(computeSheetsFromTo(1, 1)).toBe(1);
  });
});

describe("isStaleFromError", () => {
  it("true when the response body has a validation error on 'from'", () => {
    expect(
      isStaleFromError({ message: "invalid", errors: { from: ["stale"] } }),
    ).toBe(true);
  });

  it("false when the error body has no 'from' key", () => {
    expect(
      isStaleFromError({ message: "invalid", errors: { to: ["bad"] } }),
    ).toBe(false);
  });

  it("false for a body with no errors object at all", () => {
    expect(isStaleFromError({ message: "server error" })).toBe(false);
  });

  it("false for non-object input", () => {
    expect(isStaleFromError(null)).toBe(false);
    expect(isStaleFromError(undefined)).toBe(false);
  });
});

describe("buildCreatePayload", () => {
  it("builds the request payload from cashier, from, and sheet count", () => {
    const payload = buildCreatePayload({
      cashierId: 5,
      from: 123,
      sheets: 78,
    });
    expect(payload).toEqual({ account_id: 5, from: 123, to: 200 });
  });
});
