import { Group } from "@mantine/core";
import type { TableFilters } from "@/components/ui/data-table";
import { CashierFilter, DateRangeTableFilter } from "@/components/filters";

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
      <DateRangeTableFilter filters={filters} onChange={onChange} />
      <CashierFilter
        value={filters.cashier_id}
        onChange={(cashier_id) => onChange({ cashier_id })}
      />
    </Group>
  );
}
