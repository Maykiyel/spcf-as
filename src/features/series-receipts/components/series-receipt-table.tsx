import { DataTable, useServerTableState } from "@/components/ui/data-table";
import {
  getSeriesReceipts,
  SERIES_RECEIPTS_SORT_PLAN,
} from "../api/get-series-receipts";
import { seriesReceiptColumns } from "./series-receipt-columns";

export function SeriesReceiptTable() {
  const tableState = useServerTableState({
    queryKey: ["series-receipts"],
    queryFn: getSeriesReceipts,
    columns: seriesReceiptColumns,
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
