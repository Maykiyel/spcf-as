import { describe, it, expect } from "vitest";
import {
  dateRangeInitialFilters,
  dateRangePeriod,
  dateRangeUsable,
  resolveDateRangeDefault,
} from "./date-range-filter";

const range = (from: string | null, to: string | null) => ({
  from_date: from,
  to_date: to,
});

describe("dateRangeUsable", () => {
  it("allows a complete range", () => {
    expect(dateRangeUsable(range("2026-09-01", "2026-09-30"))).toBe(true);
  });

  it("allows no range at all, which these endpoints treat as unfiltered", () => {
    expect(dateRangeUsable(range(null, null))).toBe(true);
  });

  it("blocks half a range, which is a 422 rather than a looser filter", () => {
    expect(dateRangeUsable(range("2026-09-01", null))).toBe(false);
    expect(dateRangeUsable(range(null, "2026-09-30"))).toBe(false);
  });

  it("treats an empty param as unset, since a URL can carry one", () => {
    // `searchParams.get` returns "" for `?x_from_date=`, not null, and an
    // empty `filter[from_date]` is a 400.
    expect(dateRangeUsable(range("", "2026-09-30"))).toBe(false);
  });

  describe("required", () => {
    it("blocks an absent range, which the looser guard allows", () => {
      // The whole reason the flag exists: both ends are `required` on
      // `GET /reports/services-sold/{service}`.
      expect(dateRangeUsable(range(null, null), true)).toBe(false);
      expect(dateRangeUsable(range(null, null))).toBe(true);
    });

    it("allows a complete range and blocks half of one", () => {
      expect(dateRangeUsable(range("2026-09-01", "2026-09-30"), true)).toBe(
        true,
      );
      expect(dateRangeUsable(range("2026-09-01", null), true)).toBe(false);
    });

    it("treats an empty param as unset", () => {
      expect(dateRangeUsable(range("", ""), true)).toBe(false);
    });
  });
});

describe("resolveDateRangeDefault", () => {
  it("is an absent range when the table declares no default", () => {
    expect(resolveDateRangeDefault({})).toEqual({ from: null, to: null });
  });

  it("calls the default once per resolution, not once per read", () => {
    // A moving default is the trap: `setFilters` drops a value equal to the
    // declared one, so a default recomputed mid-mount would erase the
    // period a user had just picked.
    let calls = 0;
    const spec = {
      default: () => {
        calls += 1;
        return { from: `2026-09-0${calls}`, to: "2026-09-30" };
      },
    };

    expect(resolveDateRangeDefault(spec)).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(calls).toBe(1);
  });
});

describe("dateRangePeriod / dateRangeInitialFilters", () => {
  it("round-trips a period through the filter pair", () => {
    const period = { from: "2026-09-01", to: "2026-09-30" };
    expect(dateRangePeriod(dateRangeInitialFilters(period))).toEqual(period);
  });

  it("reads an undeclared range as absent rather than undefined", () => {
    expect(dateRangePeriod({})).toEqual({ from: null, to: null });
  });
});
