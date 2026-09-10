import { createContext, useContext } from "react";
import type {
  DataTableContextValue,
  DataTableProviderValue,
  TableFilterBinding,
} from "./types";
import {
  dateRangeInitialFilters,
  dateRangePeriod,
  type DateRangePeriod,
} from "./date-range-filter";

export const DataTableContext =
  createContext<DataTableProviderValue<any> | null>(null);

function useProviderValue(): DataTableProviderValue<any> {
  const ctx = useContext(DataTableContext);
  if (!ctx) {
    throw new Error(
      "DataTable subcomponents must be used within <DataTable.Root>",
    );
  }
  return ctx;
}

export function useDataTableContext<T>(): DataTableContextValue<T> {
  return useProviderValue();
}

/**
 * Binds a filter control to one of this table's declared keys.
 *
 * Called once at the top of a panel and returns an accessor, rather than
 * being a hook per key: two panels render controls conditionally, which a
 * `useTableFilter(key)` would make a conditional hook call.
 */
export function useTableFilters(): (key: string) => TableFilterBinding {
  const { filters, setFilters } = useProviderValue();

  return (key: string) => {
    // Undeclared keys are dropped by `declaredOnly`, so without this the
    // control renders and silently does nothing. Same class of wiring
    // mistake as composing a piece outside `DataTable.Root`, and thrown on
    // the same render.
    if (!(key in filters)) {
      throw new Error(
        `\`${key}\` is not a declared filter on this table. Declared: ${Object.keys(filters).join(", ") || "none"}`,
      );
    }

    return {
      value: filters[key],
      onChange: (value) => setFilters({ [key]: value }),
    };
  };
}

/** Binds the date range, whose two keys come from the table's `dateRange`
 * declaration rather than from a panel, so there is nothing to name here. */
export function useTableDateRange(): {
  period: DateRangePeriod;
  onChange: (period: DateRangePeriod) => void;
} {
  const { filters, setFilters } = useProviderValue();

  if (!("from_date" in filters)) {
    throw new Error(
      "This table declares no date range. Pass `dateRange` to `useServerTableState`",
    );
  }

  return {
    period: dateRangePeriod(filters),
    // One patch, not two writes: the range moves both ends at once and two
    // writes would mean two refetches for one action.
    onChange: (period) => setFilters(dateRangeInitialFilters(period)),
  };
}
