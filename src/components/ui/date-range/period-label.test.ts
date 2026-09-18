import { describe, it, expect } from "vitest";
import { periodLabel } from "./period-label";

describe("periodLabel", () => {
  it("says all dates when there is no range", () => {
    expect(periodLabel(null, null)).toBe("Showing all dates");
  });

  it("names the month when the range is exactly one calendar month", () => {
    expect(periodLabel("2026-09-01", "2026-09-30")).toBe(
      "Showing September 2026",
    );
  });

  it("names a short month in full too", () => {
    // Leap year: the last day is the 29th, so a hardcoded 28 would fall
    // through to the two-date wording.
    expect(periodLabel("2024-02-01", "2024-02-29")).toBe(
      "Showing February 2024",
    );
  });

  it("gives two dates when a range starts on the first but ends mid-month", () => {
    // The whole-month wording has to check both ends. Checking only the
    // first would call this September.
    expect(periodLabel("2026-09-01", "2026-09-15")).toBe(
      "Showing Sep 1 – Sep 15, 2026",
    );
  });

  it("gives two dates when a range ends on the last but starts mid-month", () => {
    expect(periodLabel("2026-09-15", "2026-09-30")).toBe(
      "Showing Sep 15 – Sep 30, 2026",
    );
  });

  it("names the year once for a range inside one year", () => {
    expect(periodLabel("2026-09-01", "2026-10-15")).toBe(
      "Showing Sep 1 – Oct 15, 2026",
    );
  });

  it("names both years for a range crossing a year boundary", () => {
    expect(periodLabel("2025-12-01", "2026-01-15")).toBe(
      "Showing Dec 1, 2025 – Jan 15, 2026",
    );
  });

  it("claims nothing when only one end is set", () => {
    // "All dates" here would contradict the empty table beneath it: that
    // state sends no request and shows no rows.
    expect(periodLabel("2026-09-01", null)).toBeNull();
    expect(periodLabel(null, "2026-09-30")).toBeNull();
  });

  it("claims nothing for a date the API could not have sent", () => {
    expect(periodLabel("2026-02-30", "2026-03-15")).toBeNull();
  });
});
