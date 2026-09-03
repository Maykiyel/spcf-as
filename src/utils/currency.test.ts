import { describe, it, expect } from "vitest";
import {
  formatCompactCurrency,
  formatCurrency,
  roundToCents,
} from "./currency";

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

describe("roundToCents", () => {
  it("leaves a clean two-decimal amount unchanged", () => {
    expect(roundToCents(1000)).toBe(1000);
  });

  it("clears sub-centavo float drift from summed line totals", () => {
    // A realistic drift pattern: several 2-decimal amounts summed in
    // floating point can land a hair off a round number.
    expect(roundToCents(0.1 + 0.2)).toBe(0.3);
    expect(roundToCents(1000.0000000000001)).toBe(1000);
    expect(roundToCents(999.9999999999999)).toBe(1000);
  });

  it("rounds a genuine fraction of a centavo to the nearest centavo", () => {
    expect(roundToCents(1000.005)).toBe(1000.01);
    expect(roundToCents(1000.004)).toBe(1000);
  });
});

describe("formatCompactCurrency", () => {
  // For chart axis ticks, where a full "₱11,501,690.00" is wider than the
  // plot area it labels. The tooltip keeps the exact figure.
  it("leaves a small amount readable in full", () => {
    expect(formatCompactCurrency(950)).toBe("₱950");
  });

  it("shortens thousands", () => {
    expect(formatCompactCurrency(1200)).toBe("₱1.2K");
  });

  it("shortens millions", () => {
    expect(formatCompactCurrency(11501690)).toBe("₱11.5M");
  });

  it("formats zero without a suffix", () => {
    expect(formatCompactCurrency(0)).toBe("₱0");
  });

  it("drops the decimal on a round value", () => {
    expect(formatCompactCurrency(2000000)).toBe("₱2M");
  });
});
