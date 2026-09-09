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
      field: "cashier",
      // The wire still calls this field `account`, so that is what a header
      // click has to send. `SERIES_RECEIPTS_SORT_PLAN` allow-lists it.
      sortKey: "account",
      header: "Cashier",
      render: (row) => row.cashier.full_name,
    },
    { field: "from", header: "From" },
    { field: "to", header: "To" },
    {
      field: "remaining_sheets",
      header: "Remaining Sheets",
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
