import { Anchor, Divider } from "@mantine/core";
import { Link, useNavigate } from "react-router";
import {
  DataTable,
  useServerTableState,
  type ColumnDef,
  type SortEntry,
  type TableFilters,
} from "@/components/ui/data-table";
import { useAuthStore } from "@/stores/auth-store";
import { formatCurrency } from "@/utils/currency";
import {
  getTransactions,
  TRANSACTIONS_QUERY_KEY,
} from "../api/get-transactions";
import { formatTransactionDate } from "../lib/transaction-date";
import type { TransactionListRow } from "../types";
import { TransactionListFilters } from "./transaction-list-filters";
import { TransactionItemNamesCell } from "./transaction-item-names-cell";
import { TransactionStatusBadge } from "./transaction-status-badge";

const URL_KEY = "receipts";

/** `/transactions` sorts by `-created_at` when asked for nothing. Declaring
 * it puts a caret on the Date header saying so, instead of rows that are
 * plainly newest-first under a column that looks unsorted — which makes the
 * first click on it appear to reverse a sort nobody indicated was there.
 *
 * `created_at` is the endpoint's name for it, matching the Date column's
 * `sortKey`. It reaches the wire on the first request, so it is one of the
 * two places getting that name wrong is a 422 before the user touches
 * anything. */
const INITIAL_SORTS: SortEntry[] = [{ key: "created_at", direction: "desc" }];

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

/** The recipe from the shared README: while one end of the range is set and
 * the other isn't, the range isn't a filter yet and the query doesn't run.
 * `to_date` carries `after_or_equal:from_date`, so sending half of one is a
 * 422. `DateRangeFilter` never emits a half-picked range, but a restored
 * URL can still carry one. */
const filtersUsable = (filters: TableFilters) =>
  Boolean(filters.from_date) === Boolean(filters.to_date);

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

  // Only the four keys `/transactions` allow-lists are marked sortable —
  // `created_at`, `status`, `customer` and `series_number`. Anything else
  // is a 422 on the first header click. Two of them are named through
  // `sortKey`, because the endpoint returns those columns in fields called
  // something else.
  const columns: ColumnDef<TransactionListRow>[] = [
    {
      key: "date",
      sortKey: "created_at",
      header: "Date",
      sortable: true,
      render: (row) => formatTransactionDate(row.date),
    },
    {
      key: "control_id",
      header: "Control ID",
      // A real link, not just a row that happens to be clickable. It is
      // what a keyboard reaches and a screen reader announces, and what
      // makes middle-click and open-in-new-tab work; `onRowClick` below is
      // the mouse affordance layered over it.
      render: (row) => (
        <Anchor component={Link} to={`/transactions/${row.control_id}`}>
          {row.control_id}
        </Anchor>
      ),
    },
    {
      key: "series_number",
      header: "Series No.",
      sortable: true,
      // `null` until the transaction is saved, and this page lists every
      // status.
      render: (row) => row.series_number ?? "—",
    },
    {
      key: "customer_name",
      sortKey: "customer",
      header: "Payer",
      sortable: true,
      render: (row) => row.customer_name ?? "—",
    },
    // Admin only. The endpoint scopes a cashier to their own rows, so for
    // them this column is their own name repeated down the page — and the
    // filter beside it isn't theirs to use either.
    ...(isAdmin
      ? [
          {
            key: "cashier" as const,
            header: "Cashier",
            // Not sortable: `/transactions` allow-lists no cashier sort.
            render: (row: TransactionListRow) => row.cashier?.full_name ?? "—",
          },
        ]
      : []),
    {
      key: "items",
      header: "Items",
      render: (row) => <TransactionItemNamesCell items={row.items} />,
    },
    {
      key: "total",
      header: "Total",
      render: (row) => (row.total === null ? "—" : formatCurrency(row.total)),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <TransactionStatusBadge status={row.status} />,
    },
  ];

  const tableState = useServerTableState({
    queryKey: [...TRANSACTIONS_QUERY_KEY],
    queryFn: getTransactions,
    columns,
    urlKey: URL_KEY,
    initialSorts: INITIAL_SORTS,
    initialFilters: isAdmin ? ADMIN_FILTERS : BASE_FILTERS,
    filtersUsable,
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
