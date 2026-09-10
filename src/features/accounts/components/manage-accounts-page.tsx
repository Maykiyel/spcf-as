import { Divider, Group, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { DataTable, useServerTableState } from "@/components/ui/data-table";
import { PrimaryButton } from "@/components/ui/button";
import {
  getUserAccounts,
  USER_ACCOUNTS_QUERY_KEY,
  USER_ACCOUNTS_SORT_PLAN,
} from "../api/get-user-accounts";
import { UserAccountFilterPanel } from "./user-account-filter-panel";
import { CreateAccountModal } from "./create-account-modal";
import { userAccountColumns } from "./user-account-columns";

const URL_KEY = "accounts";

/** `role` and `is_active` are the only two filters `/users` allows, and
 * `null` is what each sends when unfiltered. Module scope for the same
 * reason: `useServerTableState` keys its query on this object. */
const INITIAL_FILTERS = { role: null, is_active: null };

export function ManageAccountsPage() {
  const [createOpen, { open: openCreate, close: closeCreate }] =
    useDisclosure(false);

  const tableState = useServerTableState({
    queryKey: [...USER_ACCOUNTS_QUERY_KEY],
    queryFn: getUserAccounts,
    columns: userAccountColumns,
    urlKey: URL_KEY,
    sortPlan: USER_ACCOUNTS_SORT_PLAN,
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
          <UserAccountFilterPanel />
        </DataTable.Toolbar>
        <DataTable.Grid />
        <DataTable.Pagination />
      </DataTable.Root>
    </Stack>
  );
}
