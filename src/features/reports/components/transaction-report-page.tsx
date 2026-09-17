import { Divider } from "@mantine/core";
import {
  DataTable,
  useServerTableState,
  type TableFilters,
} from "@/components/ui/data-table";
import { currentMonthRange } from "@/components/ui/date-range";
import {
  getTransactionReport,
  TRANSACTION_REPORT_SORT_PLAN,
} from "../api/get-transaction-report";
import { TRANSACTION_REPORT_QUERY_KEY } from "../api/reports-query-keys";
import { TransactionReportFilters } from "./transaction-report-filters";
import { TransactionReportTotal } from "./transaction-report-total";
import { transactionReportColumns } from "./transaction-report-columns";

const URL_KEY = "transactions_report";

/** Module scope, not rebuilt per render: the query key includes it. */
const REPORT_FILTERS: TableFilters = { cashier_id: null };

/**
 * The Transactions Report. Page pagination rather than the cursor mode the
 * endpoint also offers, because `DataTable.Pagination` needs a total row
 * count and cursor mode returns none.
 */
export function TransactionReportPage() {
  const tableState = useServerTableState({
    queryKey: [...TRANSACTION_REPORT_QUERY_KEY],
    queryFn: getTransactionReport,
    columns: transactionReportColumns,
    urlKey: URL_KEY,
    sortPlan: TRANSACTION_REPORT_SORT_PLAN,
    initialFilters: REPORT_FILTERS,
    // Optional, unlike its two siblings: no row here links anywhere that
    // needs both dates, so an admin can still clear to all dates. The
    // default is what stops the total beneath the table reading all-time.
    dateRange: { default: currentMonthRange },
  });

  return (
    <DataTable.Root title="Transactions Report" state={tableState}>
      <TransactionReportFilters />
      <Divider />
      <DataTable.Toolbar>
        <DataTable.PageSize />
        <DataTable.ClearFilters />
      </DataTable.Toolbar>
      <DataTable.Period />
      <DataTable.Grid />
      <TransactionReportTotal
        total={tableState.meta}
        isError={tableState.isError}
      />
      <DataTable.Pagination />
    </DataTable.Root>
  );
}
