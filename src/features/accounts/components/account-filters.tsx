import { SegmentedControl } from "@mantine/core";

/** Both controls are the shape #59 settled on: they take a value and
 * report a change, and know nothing about the URL. `useServerTableState`
 * owns the values, puts them in the query key and persists them —
 * `ServiceStatusFilter`, which reaches into the URL itself, is the older
 * way and is what #84 migrates off.
 *
 * `null` is "unfiltered", and is what the hook drops from the request
 * rather than sending empty. `SegmentedControl` has no null, so "all"
 * stands in for it at the control's edge only.
 */
const ALL = "all";

type FilterProps = {
  value: string | null;
  onChange: (value: string | null) => void;
};

const toFilterValue = (value: string) => (value === ALL ? null : value);

export function AccountRoleFilter({ value, onChange }: FilterProps) {
  return (
    <SegmentedControl
      size="xs"
      aria-label="Role"
      value={value ?? ALL}
      onChange={(next) => onChange(toFilterValue(next))}
      data={[
        { label: "All Roles", value: ALL },
        { label: "Admin", value: "admin" },
        { label: "Cashier", value: "cashier" },
      ]}
    />
  );
}

/** `1`/`0` rather than `active`/`inactive`: `filter[is_active]` is a
 * `boolean` rule over a `tinyint` column, and these are the values the
 * wire takes. `TableFilters` holds strings and nothing else, so keeping
 * the wire's own form here is what keeps the mapping to the request a
 * no-op — at the cost of `?accounts_is_active=1` in the URL, which is the
 * same trade #84 makes for services. */
export function AccountStatusFilter({ value, onChange }: FilterProps) {
  return (
    <SegmentedControl
      size="xs"
      aria-label="Status"
      value={value ?? ALL}
      onChange={(next) => onChange(toFilterValue(next))}
      data={[
        { label: "All Statuses", value: ALL },
        { label: "Active", value: "1" },
        { label: "Inactive", value: "0" },
      ]}
    />
  );
}
