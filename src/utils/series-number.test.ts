import { describe, it, expect } from "vitest";
import { formatSeriesNumber, stripSeriesNumberPadding } from "./series-number";

describe("formatSeriesNumber", () => {
  it("pads a three-digit number to six", () => {
    expect(formatSeriesNumber(123)).toBe("000123");
  });

  it("pads four- and five-digit numbers to the same width", () => {
    // Padding to a width rather than prefixing a fixed count is the whole
    // point: a ragged column is what this exists to fix.
    expect(formatSeriesNumber(1234)).toBe("001234");
    expect(formatSeriesNumber(12345)).toBe("012345");
  });

  it("leaves a six-digit number alone", () => {
    expect(formatSeriesNumber(123456)).toBe("123456");
  });

  it("leaves a longer number alone rather than truncating it", () => {
    expect(formatSeriesNumber(1234567)).toBe("1234567");
  });

  it("pads zero and one like any other number", () => {
    expect(formatSeriesNumber(0)).toBe("000000");
    expect(formatSeriesNumber(1)).toBe("000001");
  });

  it("reads an unassigned sheet as a dash", () => {
    // A transaction that has not been saved has no sheet yet, and a blank
    // beside a label reads as a bug.
    expect(formatSeriesNumber(null)).toBe("—");
  });
});

describe("stripSeriesNumberPadding", () => {
  it("removes leading zeros from an all-digit term", () => {
    // The reason it exists: the screen now shows `000123` and the stored
    // value is `123`, so a copied number would match nothing.
    expect(stripSeriesNumberPadding("000123")).toBe("123");
  });

  it("leaves a term containing any non-digit untouched", () => {
    // The Series Receipts box also searches the cashier's name.
    expect(stripSeriesNumberPadding("Noli Cruz")).toBe("Noli Cruz");
    expect(stripSeriesNumberPadding("0012ab")).toBe("0012ab");
  });

  it("leaves a term of only zeros untouched", () => {
    // There is no number under it to strip down to.
    expect(stripSeriesNumberPadding("000")).toBe("000");
    expect(stripSeriesNumberPadding("0")).toBe("0");
  });

  it("leaves a term with no leading zeros untouched", () => {
    expect(stripSeriesNumberPadding("123")).toBe("123");
  });

  it("handles an empty term", () => {
    expect(stripSeriesNumberPadding("")).toBe("");
  });
});
