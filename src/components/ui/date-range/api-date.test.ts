import { describe, it, expect } from "vitest";
import { toApiDate } from "./api-date";

describe("toApiDate", () => {
  // The case this function exists to prevent. `TransactionResource.date` is
  // `created_at`, a full ISO-8601 timestamp with six fractional digits, and
  // the API rejects that shape as a date filter with a 422 (see
  // BACKEND_NOTES.md, "Date filters are strict Y-m-d"). A "filter to this
  // transaction's day" feature that fed the response value straight back
  // would fail on its first click.
  it("truncates a response timestamp to its date part", () => {
    expect(toApiDate("2026-08-24T06:30:00.000000Z")).toBe("2026-08-24");
  });

  it("keeps the API's own day for a late-evening UTC timestamp", () => {
    // 2026-08-24T18:00Z is already 2026-08-25 in Manila. The backend runs on
    // UTC, so its date comparisons are UTC-day comparisons — reparsing this
    // into local time and taking the local day would ask the API for a
    // different day than the one the row is filed under.
    expect(toApiDate("2026-08-24T18:00:00.000000Z")).toBe("2026-08-24");
  });

  it("passes a date-only string through unchanged", () => {
    expect(toApiDate("2026-08-24")).toBe("2026-08-24");
  });

  it("takes the local calendar date of a picked Date", () => {
    // A date picked as Aug 24 is Aug 23T16:00Z in UTC+8, so going through
    // toISOString() here would send the day before the one the user clicked.
    const picked = new Date(2026, 7, 24, 0, 30, 0);
    expect(toApiDate(picked)).toBe("2026-08-24");
  });

  it("pads single-digit months and days", () => {
    expect(toApiDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("returns null for an absent value", () => {
    expect(toApiDate(null)).toBeNull();
    expect(toApiDate(undefined)).toBeNull();
    expect(toApiDate("")).toBeNull();
  });

  it("returns null for a date-shaped value that isn't a date", () => {
    // Both match the date-only regex. Branding either would let a 422
    // through the one type that exists to prevent them.
    expect(toApiDate("2026-13-45")).toBeNull();
    expect(toApiDate("2026-02-30")).toBeNull();
  });

  it("accepts a real leap day", () => {
    expect(toApiDate("2028-02-29")).toBe("2028-02-29");
  });

  it("returns null for an unparseable value rather than sending a 422", () => {
    expect(toApiDate("not-a-date")).toBeNull();
    expect(toApiDate(new Date("not-a-date"))).toBeNull();
  });
});
