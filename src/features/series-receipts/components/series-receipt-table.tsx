import {
  DataTable,
  useServerTableState,
  type ColumnDef,
} from "@/components/ui/data-table";
import {
  getSeriesReceipts,
  SERIES_RECEIPTS_SORT_PLAN,
} from "../api/get-series-receipts";
import type { SeriesReceipt } from "../types";

export function SeriesReceiptTable() {
  const columns: ColumnDef<SeriesReceipt>[] = [
    {
      key: "cashier",
      // The wire still calls this field `account`, so that is what a header
      // click has to send. `SERIES_RECEIPTS_SORT_PLAN` allow-lists it.
      sortKey: "account",
      header: "Cashier",
      sortable: true,
      render: (row) => row.cashier.full_name,
    },
    { key: "from", header: "From", sortable: true },
    { key: "to", header: "To", sortable: true },
    {
      key: "remaining_sheets",
      header: "Remaining Sheets",
      sortable: true,
    },
  ];

  const tableState = useServerTableState({
    queryKey: ["series-receipts"],
    queryFn: getSeriesReceipts,
    columns,
    urlKey: "series-receipts",
    sortPlan: SERIES_RECEIPTS_SORT_PLAN,
  });

  return (
    <DataTable.Root title="Series Receipts" state={tableState}>
      <DataTable.Toolbar>
        <DataTable.PageSize />
        <DataTable.Search />
      </DataTable.Toolbar>
      <DataTable.Grid />
      <DataTable.Pagination />
    </DataTable.Root>
  );
}
