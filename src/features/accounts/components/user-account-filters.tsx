import { SegmentedControl } from "@mantine/core";

/** Both controls are the shape #59 settled on: they take a value and
 * report a change, and know nothing about the URL. `useServerTableState`
 * owns the values, puts them in the query key and persists them —
 * `ServiceStatusFilter`, which reaches into the URL itself, is the older
 * way and is what #84 migrates off.
 *
 * Named `UserAccount*` after the record they filter, like
 * `UserAccountActionsCell`. Bare "Accounts" is the sidebar nav group in
 * `CONTEXT.md`, which is a different thing.
 *
 * `null` is "unfiltered", and is what the hook drops from the request
 * rather than sending empty. `SegmentedControl` has no null, so `ALL`
 * stands in for it at the control's edge only.
 */
const ALL = "all";

type FilterProps = {
  value: string | null;
  onChange: (value: string | null) => void;
};

type Option = { label: string; value: string };

function TableFilterSegments({
  label,
  allLabel,
  options,
  value,
  onChange,
}: FilterProps & { label: string; allLabel: string; options: Option[] }) {
  return (
    <SegmentedControl
      size="xs"
      aria-label={label}
      value={value ?? ALL}
      onChange={(next) => onChange(next === ALL ? null : next)}
      data={[{ label: allLabel, value: ALL }, ...options]}
    />
  );
}

export function UserAccountRoleFilter(props: FilterProps) {
  return (
    <TableFilterSegments
      label="Role"
      allLabel="All Roles"
      options={[
        { label: "Admin", value: "admin" },
        { label: "Cashier", value: "cashier" },
      ]}
      {...props}
    />
  );
}

/** `1`/`0` rather than `active`/`inactive`. This is a **departure** from
 * the rule on `TableFilters` in `data-table/types.ts`, which puts the
 * conversion to the wire's shape in the feature's own `getX`.
 *
 * `filter[is_active]` is a `boolean` rule over a `tinyint`, so `1`/`0` is
 * what the endpoint takes, and `TableFilters` holds strings and nothing
 * else. Converting in `getUserAccounts` would leave the URL reading
 * `accounts_is_active=active` — the wire's key against a value the wire
 * won't accept — and put back the per-consumer mapping step #59 removed.
 * #84 decides exactly this for the same filter on services
 * (`/services?services_is_active=1`); note that services today still uses
 * the older bespoke hook and reads `services_status=active`, so the
 * precedent is that issue's decision, not the code on `main`. */
export function UserAccountStatusFilter(props: FilterProps) {
  return (
    <TableFilterSegments
      label="Status"
      allLabel="All Statuses"
      options={[
        { label: "Active", value: "1" },
        { label: "Inactive", value: "0" },
      ]}
      {...props}
    />
  );
}
