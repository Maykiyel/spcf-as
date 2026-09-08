import { Anchor } from "@mantine/core";
import { Link } from "react-router";
import type { ColumnDef, SortEntry } from "@/components/ui/data-table";
import { formatCurrency } from "@/utils/currency";
import { formatDateTime } from "@/utils/date-time";
import type { TransactionReportRow } from "../types";

/** The endpoint's own `defaultSort` is `-created_at`, so declaring it puts a
 * caret on the Date header rather than leaving rows plainly ordered under a
 * column that looks unsorted. */
export const TRANSACTION_REPORT_DEFAULT_SORTS: SortEntry[] = [
  { key: "created_at", direction: "desc" },
];

/** The columns of `GET /reports/transactions`. Its sort allow-list is not
 * `/transactions`': `customer_name` rather than `customer`, and `cashier_name`
 * allowed here. A wrong name is a 422 on the first header click. */
export const transactionReportColumns: ColumnDef<TransactionReportRow>[] = [
  {
    key: "date",
    sortKey: "created_at",
    header: "Date",
    sortable: true,
    render: (row) => formatDateTime(row.date),
  },
  {
    key: "control_id",
    sortKey: "id",
    header: "Control ID",
    sortable: true,
    // A real link, not just a clickable row: it is what a keyboard reaches,
    // a screen reader announces, and middle-click opens.
    render: (row) => (
      <Anchor component={Link} to={`/transactions/${row.control_id}`}>
        {row.control_id}
      </Anchor>
    ),
  },
  {
    key: "customer_name",
    header: "Payer",
    sortable: true,
    render: (row) => row.customer_name ?? "—",
  },
  {
    key: "cashier",
    sortKey: "cashier_name",
    header: "Cashier",
    sortable: true,
    render: (row) => row.cashier?.full_name ?? "—",
  },
  {
    key: "total",
    header: "Total",
    sortable: true,
    render: (row) => (row.total === null ? "—" : formatCurrency(row.total)),
  },
  {
    key: "amount_paid",
    header: "Amount Paid",
    sortable: true,
    render: (row) => formatCurrency(row.amount_paid),
  },
  {
    key: "change_amount",
    header: "Change",
    sortable: true,
    render: (row) => formatCurrency(row.change_amount),
  },
];
