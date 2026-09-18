import type { ColumnDef } from "@/components/ui/data-table";
import { formatSeriesNumber } from "@/utils/series-number";
import { SeriesReceiptStatusBadge } from "./series-receipt-status-badge";
import type { SeriesReceipt } from "../types";

export const seriesReceiptColumns: ColumnDef<SeriesReceipt>[] = [
  {
    field: "cashier",
    // The wire still calls this field `account`, so that is what a header
    // click has to send. `SERIES_RECEIPTS_SORT_PLAN` allow-lists it.
    sortKey: "account",
    header: "Cashier",
    render: (row) => row.cashier.full_name,
  },
  {
    field: "from",
    header: "From",
    render: (row) => formatSeriesNumber(row.from),
  },
  { field: "to", header: "To", render: (row) => formatSeriesNumber(row.to) },
  {
    field: "remaining_sheets",
    header: "Remaining Sheets",
  },
  {
    // No `field`, no `sortKey`: the endpoint offers no status filter or
    // sort at all, so this is unsortable by construction rather than by
    // omission.
    id: "status",
    header: "Status",
    render: (row) => <SeriesReceiptStatusBadge status={row.status} />,
  },
];
