import { Group } from "@mantine/core";
import type { TableFilters } from "@/components/ui/data-table";
import { DateRangeTableFilter } from "@/components/filters";

type ActivityLogFiltersProps = {
  filters: TableFilters;
  /** `setFilters`. A patch, because the date range moves both ends at once
   * and two writes would mean two refetches for one action. */
  onChange: (patch: TableFilters) => void;
};

/** The endpoint's entire filter surface. It allow-lists no search, no
 * event type and no actor, and an unknown key is a 400. */
export function ActivityLogFilters({
  filters,
  onChange,
}: ActivityLogFiltersProps) {
  return (
    <Group align="flex-end" gap="md" wrap="wrap">
      <DateRangeTableFilter filters={filters} onChange={onChange} />
    </Group>
  );
}
