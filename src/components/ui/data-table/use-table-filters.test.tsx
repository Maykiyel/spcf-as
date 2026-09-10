// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { DataTableContext } from "./data-table-context";
import { useTableFilters, useTableDateRange } from "./index";
import type { DataTableProviderValue, TableFilters } from "./types";

// Seam: the two accessors under a hand-built provider value. What matters
// here is only what a panel gets back for a key, so the rest of the table
// state is a stub with its own tests elsewhere.

type Row = { id: string };

function wrapperFor(filters: TableFilters, setFilters = vi.fn()) {
  const value: DataTableProviderValue<Row> = {
    columns: [],
    rows: [],
    totalCount: 0,
    isLoading: false,
    isError: false,
    errorMessage: null,
    page: 1,
    pageSize: 25,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    searchQuery: "",
    onSearchChange: vi.fn(),
    sorts: [],
    onSort: vi.fn(),
    filters,
    setFilters,
  };

  return {
    setFilters,
    wrapper: ({ children }: { children: ReactNode }) => (
      <DataTableContext.Provider value={value}>
        {children}
      </DataTableContext.Provider>
    ),
  };
}

describe("useTableFilters", () => {
  it("hands a control the current value of the key it names", () => {
    const { wrapper } = wrapperFor({ cashier_id: "7", status: null });
    const { result } = renderHook(() => useTableFilters(), { wrapper });

    expect(result.current("cashier_id").value).toBe("7");
    expect(result.current("status").value).toBeNull();
  });

  it("writes a change back as a patch on that key alone", () => {
    const { wrapper, setFilters } = wrapperFor({
      cashier_id: null,
      status: "completed",
    });
    const { result } = renderHook(() => useTableFilters(), { wrapper });

    result.current("cashier_id").onChange("7");

    expect(setFilters).toHaveBeenCalledWith({ cashier_id: "7" });
  });

  it("throws on a key the table never declared", () => {
    // `declaredOnly` drops it, so without the throw the control renders and
    // silently does nothing, which is the worse failure.
    const { wrapper } = wrapperFor({ cashier_id: null });
    const { result } = renderHook(() => useTableFilters(), { wrapper });

    expect(() => result.current("cashier")).toThrow(
      /not a declared filter on this table/,
    );
  });

  it("names the keys that are declared, so the typo is visible", () => {
    const { wrapper } = wrapperFor({ cashier_id: null, from_date: null });
    const { result } = renderHook(() => useTableFilters(), { wrapper });

    expect(() => result.current("cashierId")).toThrow(/cashier_id, from_date/);
  });

  it("treats a declared key holding null as declared", () => {
    // The unfiltered value is `null`, so a `filters[key]` truthiness check
    // would reject every filter nobody has set yet.
    const { wrapper } = wrapperFor({ status: null });
    const { result } = renderHook(() => useTableFilters(), { wrapper });

    expect(() => result.current("status")).not.toThrow();
  });
});

describe("useTableDateRange", () => {
  it("reads both ends off the table's declared pair", () => {
    const { wrapper } = wrapperFor({
      from_date: "2026-08-01",
      to_date: "2026-08-31",
    });
    const { result } = renderHook(() => useTableDateRange(), { wrapper });

    expect(result.current.period).toEqual({
      from: "2026-08-01",
      to: "2026-08-31",
    });
  });

  it("moves both ends in one patch", () => {
    // Two writes would mean two refetches for one action, and half a range
    // is a 422 everywhere in this API.
    const { wrapper, setFilters } = wrapperFor({
      from_date: null,
      to_date: null,
    });
    const { result } = renderHook(() => useTableDateRange(), { wrapper });

    result.current.onChange({ from: "2026-08-01", to: "2026-08-31" });

    expect(setFilters).toHaveBeenCalledTimes(1);
    expect(setFilters).toHaveBeenCalledWith({
      from_date: "2026-08-01",
      to_date: "2026-08-31",
    });
  });

  it("throws on a table that declares no date range", () => {
    const { wrapper } = wrapperFor({ status: null });

    expect(() => renderHook(() => useTableDateRange(), { wrapper })).toThrow(
      /declares no date range/,
    );
  });
});
