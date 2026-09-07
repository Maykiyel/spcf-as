import { Divider } from "@mantine/core";
import { useNavigate } from "react-router";
import {
  DataTable,
  useServerTableState,
  type TableFilters,
} from "@/components/ui/data-table";
import { useAuthStore } from "@/stores/auth-store";
import {
  getTransactions,
  TRANSACTIONS_QUERY_KEY,
} from "../api/get-transactions";
import type { TransactionListRow } from "../types";
import { transactionFiltersUsable } from "../lib/transaction-filters";
import { TransactionListFilters } from "./transaction-list-filters";
import {
  transactionListColumns,
  TRANSACTIONS_DEFAULT_SORTS,
} from "./transaction-list-columns";

const URL_KEY = "receipts";

/** The six filters `/transactions` allows everyone, keyed by the API's own
 * filter names, with `null` for unfiltered. Module scope, not rebuilt per
 * render: `useServerTableState` keys its query on this object.
 *
 * `customer` rather than `customer_name`, and `item_name` matching against
 * the items relation rather than a column — both are the wire's names, not
 * the row's. */
const BASE_FILTERS: TableFilters = {
  customer: null,
  series_number: null,
  status: null,
  item_name: null,
  from_date: null,
  to_date: null,
};

/** The seventh, which the endpoint allow-lists **only for an admin** — a
 * cashier's request carrying it is a 400, not a silently ignored parameter.
 *
 * Role-gating it means declaring it or not, rather than rendering its
 * control or not. Only declared keys are read from the URL and only
 * declared keys are written, so a cashier can't reach the filter by
 * hand-editing the address bar either. Hiding the control alone would leave
 * that door open. */
const ADMIN_FILTERS: TableFilters = { ...BASE_FILTERS, cashier_id: null };

/**
 * View Transactions (Per Receipt) — the app's only route to finding a
 * transaction.
 *
 * There is **no search box**, and that is not an omission: `/transactions`
 * accepts no `filter[search]`, and an unknown filter key is a 400 here
 * rather than an ignored parameter, so the control would fail the first
 * time anyone typed into it. The filters are what does the finding, and
 * between payer name, series number and item name they cover it better
 * than one box over one column would.
 *
 * **Row scoping is the server's job.** A cashier's request is narrowed to
 * their own transactions before any filter applies. Nothing here
 * re-implements that; the page's only obligation is to never send a filter
 * the caller isn't allowed to.
 */
export function TransactionListPage() {
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin";
  const navigate = useNavigate();

  // Shared with the Void page, which renders the same table with the
  // Status column dropped and a Void action added. The Cashier column is
  // admin-only here for the same reason the cashier filter is: the
  // endpoint scopes a cashier to their own rows, so for them it would be
  // their own name repeated down the page.
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
      {/* The page leads with the filter panel, not with a search box.
          The toolbar below carries the page-size control and nothing
          else — there is no search piece to compose, because the
          endpoint has no search filter to compose one against. */}
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
