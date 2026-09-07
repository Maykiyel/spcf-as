import { TableFilterSegments } from "@/components/ui/table-filter";

/** Both controls take a value and report a change, knowing nothing about
 * the URL. Thin on purpose: `TableFilterSegments` owns the `null` bridge,
 * and what stays here is what the shared tier must not know, namely that
 * `/users` filters on `role` and `is_active` and what those send.
 *
 * Named `UserAccount*` after the record, since bare "Accounts" is the
 * sidebar nav group in `CONTEXT.md`.
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
