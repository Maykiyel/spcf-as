import { describe, it, expect } from "vitest";
import { formatTransactionDate } from "./transaction-date";

describe("formatTransactionDate", () => {
  // The backend's TransactionDTO.date is typed as a bare string and every
  // fixture we have is date-only. `new Date("2026-08-24")` parses as UTC
  // midnight, so rendering it in local time invents a clock reading — and
  // in any negative-offset timezone it rolls back to the previous day. A
  // printed Acknowledgement Receipt showing the wrong date is a hard
  // failure for the accounting office's paper trail, so a date-only input
  // must render as exactly that calendar date, everywhere.
  it("renders a date-only string as that exact calendar date", () => {
    expect(formatTransactionDate("2026-08-24")).toBe("Aug 24, 2026");
  });

  it("does not invent a time of day for a date-only string", () => {
    expect(formatTransactionDate("2026-08-24")).not.toMatch(/AM|PM|:/);
  });

  it("renders a full timestamp as its local calendar date", () => {
    // Built from local noon so the expected day holds regardless of the
    // machine's timezone, while the expectation itself stays a literal.
    const localNoon = new Date(2026, 7, 24, 12, 0, 0).toISOString();
    expect(formatTransactionDate(localNoon)).toBe("Aug 24, 2026");
  });

  it("falls back to a dash when the date is missing", () => {
    expect(formatTransactionDate(undefined)).toBe("—");
    expect(formatTransactionDate("")).toBe("—");
  });

  it("falls back to a dash when the date is unparseable", () => {
    expect(formatTransactionDate("not-a-date")).toBe("—");
  });
});
