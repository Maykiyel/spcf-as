import { TableFilterSegments } from "@/components/ui/table-filter";

/** Takes a value, reports a change, knows nothing about the URL.
 *
 * `1`/`0` rather than `active`/`inactive`, per the carve-out on
 * `TableFilters`. Reads "All" rather than "All Statuses", this toolbar
 * having one filter rather than two side by side.
 */
export function ServiceStatusFilter(props: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <TableFilterSegments
      label="Status"
      allLabel="All"
      options={[
        { label: "Active", value: "1" },
        { label: "Inactive", value: "0" },
      ]}
      {...props}
    />
  );
}
