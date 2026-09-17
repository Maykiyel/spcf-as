import { Group } from "@mantine/core";
import { useTableFilters } from "@/components/ui/data-table";
import { DateRangeTableFilter } from "@/components/filters";
import { PerformedByFilter } from "./performed-by-filter";

/** The endpoint's entire filter surface: a date range and the actor. It
 * allow-lists no search and no event type, and an unknown key is a 400. */
export function ActivityLogFilters() {
  const filter = useTableFilters();

  return (
    <Group align="flex-end" gap="md" wrap="wrap">
      <DateRangeTableFilter />
      <PerformedByFilter {...filter("user_id")} />
    </Group>
  );
}
