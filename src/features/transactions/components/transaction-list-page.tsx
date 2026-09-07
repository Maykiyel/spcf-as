import { Divider } from "@mantine/core";
import { useNavigate } from "react-router";
import {
  DataTable,
  useServerTableState,
  type TableFilters,
} from "@/components/ui/data-table";
import { useAuthStore } from "@/stores/auth-store";
import { getTransactions } from "../api/get-transactions";
import { TRANSACTIONS_QUERY_KEY } from "../api/transaction-query-keys";
import type { TransactionListRow } from "../types";
import { transactionFiltersUsable } from "../lib/transaction-filters";
import { TransactionListFilters } from "./transaction-list-filters";
import {
  transactionListColumns,
  TRANSACTIONS_DEFAULT_SORTS,
} from "./transaction-list-columns";

const URL_KEY = "receipts";

/** The six filters everyone gets, keyed by the API's own filter names.
 * Module scope, not rebuilt per render: the query key includes it. */
const BASE_FILTERS: TableFilters = {
  customer: null,
  series_number: null,
  status: null,
  item_name: null,
  from_date: null,
  to_date: null,
};

/** The seventh, allow-listed only for an admin: a cashier sending it gets
 * a 400. Gated by *declaring* it or not, since only declared keys are read
 * from the URL. Hiding the control alone would leave the address bar open. */
const ADMIN_FILTERS: TableFilters = { ...BASE_FILTERS, cashier_id: null };

/**
 * View Transactions (Per Receipt) — the app's only route to finding a
 * transaction. No search box: the endpoint accepts none, and the filter
 * panel does the finding.
 *
 * Row scoping is the server's job. This page's only obligation is to never
 * send a filter the caller isn't allow-listed for.
 */
export function TransactionListPage() {
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin";
  const navigate = useNavigate();

  // Shared with the Void page. Cashier is admin-only for the same reason
  // the filter is: a cashier sees only their own rows anyway.
  const columns = transactionListColumns({
    includeCashier: isAdmin,
    includeStatus: true,
  });

  const tableState = useServerTableState({
    queryKey: [...TRANSACTIONS_QUERY_KEY],
    queryFn: getTransactions,
    columns,
    urlKey: URL_KEY,
    initialSorts: TRANSACTIONS_DEFAULT_SORTS,
    initialFilters: isAdmin ? ADMIN_FILTERS : BASE_FILTERS,
    filtersUsable: transactionFiltersUsable,
  });

  return (
    <DataTable.Root title="Transactions" state={tableState}>
      {/* The page leads with the filter panel; the toolbar below carries
          the page-size control and nothing else. */}
      <TransactionListFilters
        filters={tableState.filters}
        onChange={tableState.setFilters}
        includeCashier={isAdmin}
        includeStatus
      />
      <Divider />
      <DataTable.Toolbar>
        <DataTable.PageSize />
      </DataTable.Toolbar>
      <DataTable.Grid
        onRowClick={(row: TransactionListRow) =>
          navigate(`/transactions/${row.control_id}`)
        }
      />
      <DataTable.Pagination />
    </DataTable.Root>
  );
}
