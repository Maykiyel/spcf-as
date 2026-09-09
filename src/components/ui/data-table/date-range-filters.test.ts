import { describe, it, expect } from "vitest";
import {
  dateRangeFiltersUsable,
  dateRangeFiltersRequired,
} from "./date-range-filters";

const range = (from: string | null, to: string | null) => ({
  from_date: from,
  to_date: to,
});

describe("dateRangeFiltersUsable", () => {
  it("allows a complete range", () => {
    expect(dateRangeFiltersUsable(range("2026-09-01", "2026-09-30"))).toBe(true);
  });

  it("allows no range at all, which these endpoints treat as unfiltered", () => {
    expect(dateRangeFiltersUsable(range(null, null))).toBe(true);
  });

  it("blocks half a range, which is a 422 rather than a looser filter", () => {
    expect(dateRangeFiltersUsable(range("2026-09-01", null))).toBe(false);
    expect(dateRangeFiltersUsable(range(null, "2026-09-30"))).toBe(false);
  });

  it("treats an empty param as unset, since a URL can carry one", () => {
    // `searchParams.get` returns "" for `?x_from_date=`, not null, and an
    // empty `filter[from_date]` is a 400.
    expect(dateRangeFiltersUsable(range("", "2026-09-30"))).toBe(false);
  });
});

describe("dateRangeFiltersRequired", () => {
  it("allows a complete range", () => {
    expect(dateRangeFiltersRequired(range("2026-09-01", "2026-09-30"))).toBe(
      true,
    );
  });

  it("blocks an absent range, which the looser guard allows", () => {
    // The whole reason this exists: both ends are `required` on
    // `GET /reports/services-sold/{service}`.
    expect(dateRangeFiltersRequired(range(null, null))).toBe(false);
    expect(dateRangeFiltersUsable(range(null, null))).toBe(true);
  });

  it("blocks half a range", () => {
    expect(dateRangeFiltersRequired(range("2026-09-01", null))).toBe(false);
    expect(dateRangeFiltersRequired(range(null, "2026-09-30"))).toBe(false);
  });

  it("treats an empty param as unset", () => {
    expect(dateRangeFiltersRequired(range("", ""))).toBe(false);
  });
});
