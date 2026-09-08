import { Divider } from "@mantine/core";
import {
  DataTable,
  useServerTableState,
  dateRangeFiltersUsable,
  type TableFilters,
} from "@/components/ui/data-table";
import { getTransactionReport } from "../api/get-transaction-report";
import { TRANSACTION_REPORT_QUERY_KEY } from "../api/reports-query-keys";
import { TransactionReportFilters } from "./transaction-report-filters";
import { TransactionReportTotal } from "./transaction-report-total";
import {
  transactionReportColumns,
  TRANSACTION_REPORT_DEFAULT_SORTS,
} from "./transaction-report-columns";

const URL_KEY = "report";

/** Module scope, not rebuilt per render: the query key includes it. */
const REPORT_FILTERS: TableFilters = {
  from_date: null,
  to_date: null,
  cashier_id: null,
};

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
    initialSorts: TRANSACTION_REPORT_DEFAULT_SORTS,
    initialFilters: REPORT_FILTERS,
    filtersUsable: dateRangeFiltersUsable,
  });

  return (
    <DataTable.Root title="Transactions Report" state={tableState}>
      <TransactionReportFilters
        filters={tableState.filters}
        onChange={tableState.setFilters}
      />
      <Divider />
      <DataTable.Toolbar>
        <DataTable.PageSize />
      </DataTable.Toolbar>
      <DataTable.Grid />
      <TransactionReportTotal
        total={tableState.meta}
        isError={tableState.isError}
      />
      <DataTable.Pagination />
    </DataTable.Root>
  );
}
