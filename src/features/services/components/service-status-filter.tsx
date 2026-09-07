import { TableFilterSegments } from "@/components/ui/table-filter";

/** The shape #59 settled on: takes a value, reports a change, knows
 * nothing about the URL. `useServerTableState` owns the value, puts it in
 * the query key and persists it.
 *
 * `1`/`0` rather than `active`/`inactive`, the same call
 * `UserAccountStatusFilter` makes and for the same reason — see the
 * carve-out on `TableFilters` in `data-table/types.ts`.
 *
 * Keeps "All", not "All Statuses": #84 changes nothing a user sees except
 * the URL, and this toolbar has one filter rather than two sitting side by
 * side.
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
