import { Group } from "@mantine/core";
import { DateRangeTableFilter } from "@/components/filters";

/** The endpoint's entire filter surface. It allow-lists no search, no
 * event type and no actor, and an unknown key is a 400. */
export function ActivityLogFilters() {
  return (
    <Group align="flex-end" gap="md" wrap="wrap">
      <DateRangeTableFilter />
    </Group>
  );
}
