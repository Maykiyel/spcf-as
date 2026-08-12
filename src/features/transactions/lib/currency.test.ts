import { describe, it, expect } from "vitest";
import { formatCurrency } from "./currency";

describe("formatCurrency", () => {
  it("prefixes the peso sign and pads two decimals", () => {
    expect(formatCurrency(200)).toBe("₱200.00");
  });

  it("adds thousands separators", () => {
    expect(formatCurrency(2150)).toBe("₱2,150.00");
  });

  it("rounds to two decimal places", () => {
    expect(formatCurrency(1000.005)).toBe("₱1,000.01");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("₱0.00");
  });
});
