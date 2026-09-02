import { Badge, Group, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import { IconPlus } from "@tabler/icons-react";
import {
  DataTable,
  useClientTableState,
  type ColumnDef,
} from "@/components/ui/data-table";
import { PrimaryButton } from "@/components/ui/button";
import type { Role } from "@/features/auth/types";
import {
  getUserAccounts,
  USER_ACCOUNTS_QUERY_KEY,
} from "../api/get-user-accounts";
import type { UserAccount } from "../types";
import { CreateAccountModal } from "./create-account-modal";
import { UserAccountActionsCell } from "./user-account-actions-cell";

const URL_KEY = "accounts";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  cashier: "Cashier",
};

// Module scope, not rebuilt per render: `useClientTableState` memoises its
// filtered/sorted passes on this array's identity, so a fresh one every
// render would re-filter and re-sort the whole directory every time.
const columns: ColumnDef<UserAccount>[] = [
  { key: "full_name", header: "Name", sortable: true },
  { key: "user_name", header: "Username", sortable: true },
  { key: "email", header: "Email", sortable: true },
  {
    key: "role",
    header: "Role",
    render: (row) => (
      <Badge color={row.role === "admin" ? "primary" : "tertiary"} variant="light">
        {ROLE_LABEL[row.role]}
      </Badge>
    ),
  },
  {
    key: "is_active",
    header: "Status",
    render: (row) => (
      <Badge color={row.is_active ? "success" : "danger"} variant="light">
        {row.is_active ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    // Keyed on a column already declared above, not on `id`, so that the
    // client-side search doesn't quietly match user ids: it scans every
    // declared column's raw value, and nothing on screen shows an id.
    // `id` disambiguates the duplicate key, as DataTable requires.
    key: "full_name",
    id: "actions",
    header: "Actions",
    render: (row) => <UserAccountActionsCell account={row} />,
  },
];

// Same reason as `columns`: a literal `[]` fallback would be a new array on
// every render while the query is loading or failed.
const NO_ACCOUNTS: UserAccount[] = [];

export function ManageAccountsPage() {
  const [createOpen, { open: openCreate, close: closeCreate }] =
    useDisclosure(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: USER_ACCOUNTS_QUERY_KEY,
    queryFn: getUserAccounts,
  });

  const tableState = useClientTableState({
    data: data ?? NO_ACCOUNTS,
    columns,
    urlKey: URL_KEY,
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

      {/* `useClientTableState` hardcodes `isLoading`/`isError` to false —
          it filters an array and has no network call of its own to report
          on. The fetch belongs to this page, so this page is what knows,
          and DataTable.Grid renders the skeleton and error rows from
          context either way. */}
      <DataTable.Root
        title="User Accounts"
        state={{
          ...tableState,
          isLoading,
          isError,
          errorMessage: "Couldn't load accounts. Please try again.",
        }}
      >
        <DataTable.Toolbar>
          <DataTable.PageSize />
          <DataTable.Search />
        </DataTable.Toolbar>
        <DataTable.Grid />
        <DataTable.Pagination />
      </DataTable.Root>
    </Stack>
  );
}
