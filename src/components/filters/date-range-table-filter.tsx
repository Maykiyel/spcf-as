import type { TableFilters } from "@/components/ui/data-table";
import { DateRangeFilter, toApiDate } from "@/components/ui/date-range";

type DateRangeTableFilterProps = {
  filters: TableFilters;
  /** `setFilters`. A patch, because the range moves both ends at once and
   * two writes would mean two refetches for one action. */
  onChange: (patch: TableFilters) => void;
};

/** The `from_date`/`to_date` pair every list endpoint here takes, bridged to
 * a table's filter bag. `toApiDate`, not a cast: the values are strings off
 * the URL, and this is what decides whether one is a date the API takes. */
export function DateRangeTableFilter({
  filters,
  onChange,
}: DateRangeTableFilterProps) {
  return (
    <DateRangeFilter
      label="Date Range"
      value={{
        from: toApiDate(filters.from_date),
        to: toApiDate(filters.to_date),
      }}
      onChange={(range) =>
        onChange({ from_date: range.from, to_date: range.to })
      }
    />
  );
}
