import { Divider } from "@mantine/core";
import { useNavigate } from "react-router";
import {
  DataTable,
  useServerTableState,
  type TableFilters,
} from "@/components/ui/data-table";
import {
  getVoidableTransactions,
  VOIDABLE_TRANSACTIONS_QUERY_KEY,
} from "../api/get-voidable-transactions";
import type { TransactionListRow } from "../types";
import { transactionFiltersUsable } from "../lib/transaction-filters";
import { TransactionListFilters } from "./transaction-list-filters";
import {
  transactionListColumns,
  TRANSACTIONS_DEFAULT_SORTS,
} from "./transaction-list-columns";
import { VoidTransactionAction } from "./void-transaction-action";

const URL_KEY = "void";

/** The receipts list's filters, minus `status` and with `cashier_id`
 * always present.
 *
 * **`status` is absent rather than declared with a `completed` default.**
 * `useTableControls` reads every declared key out of the query string and
 * falls back to the default only when the param is missing, so declaring
 * it would leave `?void_status=pending` a working way to fill this page
 * with rows whose Void button is guaranteed to 409. Undeclared, the key is
 * neither read nor written, and `getVoidableTransactions` pins the value
 * past anywhere the URL reaches.
 *
 * `cashier_id` needs no role gate here the way it does on the receipts
 * list: the page is admin-only through the registry, and the endpoint
 * allow-lists the filter for an admin. */
const FILTERS: TableFilters = {
  customer: null,
  series_number: null,
  item_name: null,
  from_date: null,
  to_date: null,
  cashier_id: null,
};

/**
 * Void — the admin's only way to reverse a completed payment record.
 *
 * This is the receipts list with the status pinned to `completed` and a
 * Void action per row, which is how #62 specified it and why it was built
 * after #61. The columns, the filter panel, the sort and the date-range
 * guard are all the same pieces that page uses; what differs is the three
 * arguments below and the fetcher.
 *
 * **Every row here can be voided.** That is the point of pinning the
 * status: `POST /void` accepts `completed` and answers every other status
 * with a 409, so a list that showed anything else would be offering an
 * action that cannot succeed. It also means the Status column is dropped —
 * a column reading "Completed" on every row carries no information.
 *
 * **Admin-only through the page registry**, which the server enforces
 * again on its own: `TransactionPolicy::void` refuses a cashier, and so
 * does `GET /cashiers` behind the cashier filter.
 */
export function VoidTransactionPage() {
  const navigate = useNavigate();

  const columns = transactionListColumns({
    includeCashier: true,
    includeStatus: false,
    actions: (row) => <VoidTransactionAction transaction={row} />,
  });

  const tableState = useServerTableState({
    queryKey: [...VOIDABLE_TRANSACTIONS_QUERY_KEY],
    queryFn: getVoidableTransactions,
    columns,
    urlKey: URL_KEY,
    initialSorts: TRANSACTIONS_DEFAULT_SORTS,
    initialFilters: FILTERS,
    filtersUsable: transactionFiltersUsable,
  });

  return (
    <DataTable.Root title="Void Transactions" state={tableState}>
      {/* Same panel as the receipts list, one control lighter. The
          toolbar below carries the page-size control and nothing else —
          `/transactions` has no search filter to compose a box against. */}
      <TransactionListFilters
        filters={tableState.filters}
        onChange={tableState.setFilters}
        includeCashier
        includeStatus={false}
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
