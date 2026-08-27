import { describe, it, expect } from "vitest";
import { formatTransactionDate } from "./transaction-date";

describe("formatTransactionDate", () => {
  // The backend sends `date` as a full timestamp (TransactionResource maps
  // it to `created_at`), so the timestamp case below is the real one. The
  // date-only cases guard the typed-as-string gap: `new Date("2026-08-24")`
  // parses as UTC midnight, which renders as an invented clock reading
  // locally and rolls back a day west of UTC — silently wrong on a printed
  // receipt rather than loudly wrong.
  it("renders a date-only string as that exact calendar date", () => {
    expect(formatTransactionDate("2026-08-24")).toBe("Aug 24, 2026");
  });

  it("does not invent a time of day for a date-only string", () => {
    expect(formatTransactionDate("2026-08-24")).not.toMatch(/AM|PM|:/);
  });

  it("renders a full timestamp as its local date and time", () => {
    // Built from local components so the expected wall-clock reading holds
    // regardless of the machine's timezone, while the expectation itself
    // stays a literal.
    const localAfternoon = new Date(2026, 7, 24, 14, 30, 0).toISOString();
    expect(formatTransactionDate(localAfternoon)).toBe("Aug 24, 2026, 2:30 PM");
  });

  it("pads the minutes on a full timestamp", () => {
    const localMorning = new Date(2026, 7, 24, 9, 5, 0).toISOString();
    expect(formatTransactionDate(localMorning)).toBe("Aug 24, 2026, 9:05 AM");
  });

  it("renders the microsecond-precision format the backend actually sends", () => {
    // Laravel serializes created_at with six fractional digits; Date
    // accepts it, but pin it so a format change is caught here.
    expect(formatTransactionDate("2026-08-24T06:30:00.000000Z")).toMatch(
      /^Aug 2[34], 2026, \d{1,2}:\d{2} (AM|PM)$/,
    );
  });

  it("falls back to a dash when the date is missing", () => {
    expect(formatTransactionDate(undefined)).toBe("—");
    expect(formatTransactionDate("")).toBe("—");
  });

  it("falls back to a dash when the date is unparseable", () => {
    expect(formatTransactionDate("not-a-date")).toBe("—");
  });
});
