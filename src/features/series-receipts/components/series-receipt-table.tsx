import {
  DataTable,
  useServerTableState,
  type ColumnDef,
} from "@/components/ui/data-table";
import { getSeriesReceipts } from "../api/get-series-receipts";
import type { SeriesReceipt } from "../types";

export function SeriesReceiptTable() {
  const columns: ColumnDef<SeriesReceipt>[] = [
    {
      // Wire sort key stays "account" — backend field name, see CONTEXT.md.
      key: "account",
      header: "Cashier",
      sortable: true,
      render: (row) => row.account.full_name,
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
