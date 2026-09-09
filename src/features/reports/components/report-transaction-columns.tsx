import { Anchor } from "@mantine/core";
import { Link } from "react-router";
import type { ColumnDef } from "@/components/ui/data-table";
import type { TransactionScalars } from "@/api/transactions";
import { formatCurrency } from "@/utils/currency";
import { formatDateTime } from "@/utils/date-time";

type ReportTransactionColumnsOptions = {
  /** Allow-listed on the breakdown and not on `/reports/transactions`. */
  includeSeriesNumber: boolean;
  /** `amount_paid` and `change_amount`, which are the other way round. */
  includeAmounts: boolean;
};

/** The columns of a report over `TransactionScalars`, shared by the
 * Transactions Report and the Service Breakdown. The five columns both show
 * sort under identical keys; the options are where the allow-lists differ. */
export function reportTransactionColumns({
  includeSeriesNumber,
  includeAmounts,
}: ReportTransactionColumnsOptions): ColumnDef<TransactionScalars>[] {
  return [
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
      // A real link, not just a clickable row: it is what a keyboard
      // reaches, a screen reader announces, and middle-click opens.
      render: (row) => (
        <Anchor component={Link} to={`/transactions/${row.control_id}`}>
          {row.control_id}
        </Anchor>
      ),
    },
    ...(includeSeriesNumber
      ? [
          {
            key: "series_number" as const,
            header: "Series No.",
            sortable: true,
            render: (row: TransactionScalars) => row.series_number ?? "—",
          },
        ]
      : []),
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
    ...(includeAmounts
      ? [
          {
            key: "amount_paid" as const,
            header: "Amount Paid",
            sortable: true,
            render: (row: TransactionScalars) => formatCurrency(row.amount_paid),
          },
          {
            key: "change_amount" as const,
            header: "Change",
            sortable: true,
            render: (row: TransactionScalars) =>
              formatCurrency(row.change_amount),
          },
        ]
      : []),
  ];
}
