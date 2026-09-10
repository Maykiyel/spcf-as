import { Group } from "@mantine/core";
import { useTableFilters } from "@/components/ui/data-table";
import { CashierFilter, DateRangeTableFilter } from "@/components/filters";

/** The endpoint's entire filter surface. It allow-lists no search and no
 * status, and an unknown key is a 400. The page is admin-only, so the
 * cashier picker is unconditional here. */
export function TransactionReportFilters() {
  const filter = useTableFilters();

  return (
    <Group align="flex-end" gap="md" wrap="wrap">
      <DateRangeTableFilter />
      <CashierFilter {...filter("cashier_id")} />
    </Group>
  );
}
