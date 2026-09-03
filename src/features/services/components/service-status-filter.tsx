import { SegmentedControl } from "@mantine/core";

/** The shape #59 settled on: takes a value, reports a change, and knows
 * nothing about the URL. `useServerTableState` owns the value, puts it in
 * the query key and persists it.
 *
 * `null` is "unfiltered", and is what the hook drops from the request
 * rather than sending empty. `SegmentedControl` has no null, so `ALL`
 * stands in for it at this control's edge only.
 *
 * `1`/`0` rather than `active`/`inactive`, matching
 * `UserAccountStatusFilter`. This is a **departure** from the rule on
 * `TableFilters` in `data-table/types.ts`, which puts the conversion to
 * the wire's shape in the feature's own `getX`. `filter[is_active]` is a
 * `boolean` rule over a `tinyint`, so `1`/`0` is what the endpoint takes,
 * and `TableFilters` holds strings and nothing else. Converting in
 * `getServices` would leave the URL reading `services_is_active=active` —
 * the wire's key against a value the wire won't accept — and put back the
 * per-consumer mapping step #59 removed. #84 decided exactly this.
 *
 * Deliberately not sharing `TableFilterSegments` with
 * `user-account-filters.tsx`. Two feature-local copies of fifteen lines
 * is not yet a shared control, and promoting one into `components/ui` on
 * the second consumer would be pre-building for the five table pages that
 * might want it rather than the two that do. The labels differ too: this
 * one keeps "All", because #84 changes nothing a user sees except the
 * URL.
 */
const ALL = "all";

type ServiceStatusFilterProps = {
  value: string | null;
  onChange: (value: string | null) => void;
};

export function ServiceStatusFilter({
  value,
  onChange,
}: ServiceStatusFilterProps) {
  return (
    <SegmentedControl
      size="xs"
      aria-label="Status"
      value={value ?? ALL}
      onChange={(next) => onChange(next === ALL ? null : next)}
      data={[
        { label: "All", value: ALL },
        { label: "Active", value: "1" },
        { label: "Inactive", value: "0" },
      ]}
    />
  );
}
