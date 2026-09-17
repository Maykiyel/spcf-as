import { Text } from "@mantine/core";
import { periodLabel } from "@/components/ui/date-range";
import { useTableDateRange } from "./data-table-context";

/** The period this table is showing, in words, for the reports that state
 * one. Composed as a child: `DataTable.Root` takes a title string and
 * exposes no slot in the card header, the same wall the dashboard's View
 * all link met and resolved the same way.
 *
 * It says what is on screen and knows nothing of default-ness, so a picked
 * range moves it rather than leaving a hint about a default that is no
 * longer true. */
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
