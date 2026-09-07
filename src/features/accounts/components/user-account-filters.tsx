import { TableFilterSegments } from "@/components/ui/table-filter";

/** Both controls are the shape #59 settled on: they take a value and
 * report a change, and know nothing about the URL. `useServerTableState`
 * owns the values, puts them in the query key and persists them.
 *
 * They are thin on purpose. `TableFilterSegments` owns the `null` ↔ "all"
 * bridge, which is the only part worth sharing; what stays here is what
 * this feature knows and the shared tier must not — that `/users` filters
 * on `role` and `is_active`, and what values those take on the wire.
 *
 * Named `UserAccount*` after the record they filter, like
 * `UserAccountActionsCell`. Bare "Accounts" is the sidebar nav group in
 * `CONTEXT.md`, which is a different thing.
 */
export function UserAccountRoleFilter(props: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
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

/** `1`/`0` rather than `active`/`inactive`. `filter[is_active]` is a
 * `boolean` rule over a `tinyint`, so `1`/`0` is what the endpoint takes,
 * and `TableFilters` holds strings and nothing else — see the carve-out on
 * that type in `data-table/types.ts`, which this and `ServiceStatusFilter`
 * are the two consumers of. Converting in `getUserAccounts` would leave
 * the URL reading `accounts_is_active=active`, the wire's key against a
 * value the wire won't accept. */
export function UserAccountStatusFilter(props: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
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
