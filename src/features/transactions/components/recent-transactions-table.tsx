import { Anchor, Group } from "@mantine/core";
import { Link, useNavigate } from "react-router";
import { DataTable, useServerTableState } from "@/components/ui/data-table";
import {
  getTransactions,
  TRANSACTIONS_SORT_PLAN,
} from "../api/get-transactions";
import { RECENT_TRANSACTIONS_QUERY_KEY } from "../api/transaction-query-keys";
import type { TransactionListRow } from "../types";
import { transactionListColumns } from "./transaction-list-columns";

/** A glance, not a page: `useServerTableState` would otherwise default to
 * the app's 25. */
const PAGE_SIZE = 5;

/**
 * The cashier dashboard's Recent Transactions section. CONTEXT.md carries
 * why it is cashier-only, unfiltered, and lives in this feature.
 */
export function RecentTransactionsTable() {
  const navigate = useNavigate();

  const columns = transactionListColumns({
    includeCashier: false,
    includeStatus: true,
    includeItems: false,
  });

  // No `urlKey`: nothing here changes the page, so a `recent_page` off a
  // shared dashboard URL would strand the widget with no way back.
  const tableState = useServerTableState({
    queryKey: [...RECENT_TRANSACTIONS_QUERY_KEY],
    queryFn: getTransactions,
    columns,
    initialPageSize: PAGE_SIZE,
    sortPlan: TRANSACTIONS_SORT_PLAN,
  });

  return (
    <DataTable.Root title="Recent Transactions" state={tableState}>
      <DataTable.Grid
        onRowClick={(row: TransactionListRow) =>
          // `dashboard`, not `list`: popping history lands back here, and
          // it is what stops the Back control claiming otherwise.
          navigate(`/transactions/${row.control_id}`, {
            state: { from: "dashboard" },
          })
        }
      />
      {/* In the body rather than `Card.Header`'s `actions` slot, which
          `DataTable.Root` does not expose. */}
      <Group justify="flex-end">
        <Anchor component={Link} to="/transactions/receipts" size="sm">
          View all
        </Anchor>
      </Group>
    </DataTable.Root>
  );
}
