import { Text } from "@mantine/core";
import { periodLabel } from "@/components/ui/date-range";
import { useTableDateRange } from "./data-table-context";

/** Composed as a child because `DataTable.Root` takes a title string and
 * exposes no slot in the card header. See CONTEXT.md. */
export function DataTablePeriod() {
  const { period } = useTableDateRange();
  const label = periodLabel(period.from, period.to);

  if (!label) return null;

  return (
    <Text size="sm" c="dimmed">
      {label}
    </Text>
  );
}
