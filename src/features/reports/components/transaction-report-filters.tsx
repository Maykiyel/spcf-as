import { Group } from "@mantine/core";
import type { TableFilters } from "@/components/ui/data-table";
import { DateRangeFilter, toApiDate } from "@/components/ui/date-range";
import { CashierFilter } from "@/components/filters";

type TransactionReportFiltersProps = {
  filters: TableFilters;
  /** `setFilters`. A patch, because the date range moves both ends at once
   * and two writes would mean two refetches for one action. */
  onChange: (patch: TableFilters) => void;
};

/** The endpoint's entire filter surface. It allow-lists no search and no
 * status, and an unknown key is a 400. The page is admin-only, so the
 * cashier picker is unconditional here. */
export function TransactionReportFilters({
  filters,
  onChange,
}: TransactionReportFiltersProps) {
  return (
    <Group align="flex-end" gap="md" wrap="wrap">
      {/* `toApiDate`, not a cast: the values are strings off the URL, and
          this is what decides whether one is a date the API takes. */}
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
      <CashierFilter
        value={filters.cashier_id}
        onChange={(cashier_id) => onChange({ cashier_id })}
      />
    </Group>
  );
}
