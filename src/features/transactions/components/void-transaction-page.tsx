import { Divider } from "@mantine/core";
import { useNavigate } from "react-router";
import {
  DataTable,
  useServerTableState,
  type TableFilters,
} from "@/components/ui/data-table";
import { getVoidableTransactions } from "../api/get-voidable-transactions";
import { TRANSACTIONS_SORT_PLAN } from "../api/get-transactions";
import { VOIDABLE_TRANSACTIONS_QUERY_KEY } from "../api/transaction-query-keys";
import type { TransactionListRow } from "../types";
import { TransactionListFilters } from "./transaction-list-filters";
import { transactionListColumns } from "./transaction-list-columns";
import { VoidTransactionAction } from "./void-transaction-action";

const URL_KEY = "void";

/** The receipts list's filters minus `status`, with `cashier_id` always
 * present since the page is admin-only outright.
 *
 * `status` is *absent*, not defaulted: declared keys are read from the URL,
 * so `?void_status=pending` would fill the page with rows that can only
 * 409. `getVoidableTransactions` pins it past where the URL reaches. */
const VOIDABLE_FILTERS: TableFilters = {
  customer: null,
  series_number: null,
  item_name: null,
  cashier_id: null,
};

/**
 * Void — the admin's only way to reverse a completed payment record. The
 * receipts list with the status pinned and a Void action per row, reusing
 * that page's columns, filter panel, sort and date-range guard (#62).
 *
 * Every row here can be voided, which is the point of the pin: any other
 * status is a 409. That is also why the Status column is dropped.
 *
 * Admin-only through the page registry, and again on the server.
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
    sortPlan: TRANSACTIONS_SORT_PLAN,
    initialFilters: VOIDABLE_FILTERS,
    dateRange: {},
  });

  return (
    <DataTable.Root title="Void Transactions" state={tableState}>
      {/* Same panel as the receipts list, one control lighter. */}
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
