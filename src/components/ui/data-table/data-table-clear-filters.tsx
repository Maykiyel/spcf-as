import { ActionIcon } from "@mantine/core";
import { IconFilterOff } from "@tabler/icons-react";
import { AppTooltip } from "@/components/ui/tooltip";
import { useTableClearFilters } from "./data-table-context";

const LABEL = "Clear filters";

/** Returns every filter to its declared default, empties the search and
 * goes back to page one.
 *
 * Absent rather than disabled when there is nothing to clear: its presence
 * is itself the signal that the table is narrowed, and Mantine's tooltip
 * does not fire on a disabled button, which is the workaround this avoids. */
export function DataTableClearFilters() {
  const { isFiltered, clearFilters } = useTableClearFilters();

  if (!isFiltered) return null;

  return (
    <AppTooltip label={LABEL}>
      <ActionIcon
        onClick={clearFilters}
        aria-label={LABEL}
        variant="subtle"
        color="danger"
      >
        <IconFilterOff size={18} />
      </ActionIcon>
    </AppTooltip>
  );
}
