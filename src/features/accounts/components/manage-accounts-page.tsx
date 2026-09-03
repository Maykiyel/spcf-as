import { Badge, Divider, Group, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import {
  DataTable,
  useServerTableState,
  type ColumnDef,
  type SortEntry,
} from "@/components/ui/data-table";
import { PrimaryButton } from "@/components/ui/button";
import type { Role } from "@/features/auth/types";
import {
  getUserAccounts,
  USER_ACCOUNTS_QUERY_KEY,
} from "../api/get-user-accounts";
import type { UserAccount } from "../types";
import {
  UserAccountRoleFilter,
  UserAccountStatusFilter,
} from "./user-account-filters";
import { CreateAccountModal } from "./create-account-modal";
import { UserAccountActionsCell } from "./user-account-actions-cell";

const URL_KEY = "accounts";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  cashier: "Cashier",
};

/** `/users` declares no `defaultSort`, so unsorted rows arrive in whatever
 * order the database gives — which is not stable across pages. Naming the
 * directory's obvious order fixes that and puts a caret on the header
 * saying so. Module scope, like `columns`. */
const INITIAL_SORTS: SortEntry[] = [{ key: "full_name", direction: "asc" }];

/** `role` and `is_active` are the only two filters `/users` allows, and
 * `null` is what each sends when unfiltered. Module scope for the same
 * reason: `useServerTableState` keys its query on this object. */
const INITIAL_FILTERS = { role: null, is_active: null };
// Module scope, not rebuilt per render: `useServerTableState` memoises on
// this array's identity.
//
// Every sortable key here is one `/users` allow-lists — `first_name`,
// `last_name`, `full_name`, `username`. A key it doesn't know is a 400 on
// the first header click, which is why `username` is renamed at the fetcher
// rather than carrying the wire's `user_name`.
const columns: ColumnDef<UserAccount>[] = [
  { key: "full_name", header: "Name", sortable: true },
  { key: "username", header: "Username", sortable: true },
  {
    key: "role",
    header: "Role",
    render: (row) => (
      <Badge
        color={row.role === "admin" ? "primary" : "tertiary"}
        variant="light"
      >
        {ROLE_LABEL[row.role]}
      </Badge>
    ),
  },
  {
    // Borrows a declared key, as `id` requires: `key` names the field the
    // cell reads, and this one's raw value is `true`/`false`, not what the
    // badge says.
    key: "role",
    id: "status",
    header: "Status",
    render: (row) => (
      <Badge color={row.is_active ? "success" : "danger"} variant="light">
        {row.is_active ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    key: "full_name",
    id: "actions",
    header: "Actions",
    render: (row) => <UserAccountActionsCell account={row} />,
  },
];

export function ManageAccountsPage() {
  const [createOpen, { open: openCreate, close: closeCreate }] =
    useDisclosure(false);

  const tableState = useServerTableState({
    queryKey: [...USER_ACCOUNTS_QUERY_KEY],
    queryFn: getUserAccounts,
    columns,
    urlKey: URL_KEY,
    initialSorts: INITIAL_SORTS,
    initialFilters: INITIAL_FILTERS,
  });

  return (
    <Stack gap="lg">
      <Group justify="space-between" wrap="wrap">
        <Title order={3}>Manage Accounts</Title>
        <PrimaryButton
          onClick={openCreate}
          leftSection={<IconPlus size={16} />}
        >
          New Account
        </PrimaryButton>
      </Group>

      <CreateAccountModal opened={createOpen} onClose={closeCreate} />

      <DataTable.Root title="User Accounts" state={tableState}>
        {/* No search box. `/users` accepts no `filter[search]`, and an
            unknown filter key is a 400 here rather than an ignored
            parameter, so the control would fail the first time anyone
            typed into it. The two filters are what narrows this table
            instead. */}
        <DataTable.Toolbar>
          <DataTable.PageSize />
          <Divider orientation="vertical" visibleFrom="xs" />
          <UserAccountRoleFilter
            value={tableState.filters.role}
            onChange={(role) => tableState.setFilters({ role })}
          />
          <Divider orientation="vertical" visibleFrom="xs" />
          <UserAccountStatusFilter
            value={tableState.filters.is_active}
            onChange={(is_active) => tableState.setFilters({ is_active })}
          />
        </DataTable.Toolbar>
        <DataTable.Grid />
        <DataTable.Pagination />
      </DataTable.Root>
    </Stack>
  );
}
