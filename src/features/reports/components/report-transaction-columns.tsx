import { Anchor } from "@mantine/core";
import { Link } from "react-router";
import type { ColumnDef } from "@/components/ui/data-table";
import type { TransactionScalars } from "@/api/transactions";
import { formatCurrency } from "@/utils/currency";
import { formatDateTime } from "@/utils/date-time";

type ReportTransactionColumnsOptions = {
  /** `amount_paid` and `change_amount`, which the breakdown doesn't show at
   * all. The only difference left: which of these columns sort is the two
   * endpoints' plans' business, not this builder's. */
  includeAmounts: boolean;
};

/** The columns of a report over `TransactionScalars`, shared by the
 * Transactions Report and the Service Breakdown. */
export function reportTransactionColumns({
  includeAmounts,
}: ReportTransactionColumnsOptions): ColumnDef<TransactionScalars>[] {
  const columns: ColumnDef<TransactionScalars>[] = [
    {
      field: "date",
      sortKey: "created_at",
      header: "Date",
      render: (row) => formatDateTime(row.date),
    },
    {
      field: "control_id",
      sortKey: "id",
      header: "Control ID",
      // A real link, not just a clickable row: it is what a keyboard
      // reaches, a screen reader announces, and middle-click opens.
      render: (row) => (
        <Anchor component={Link} to={`/transactions/${row.control_id}`}>
          {row.control_id}
        </Anchor>
      ),
    },
    {
      // Shown on both reports, sortable on only one: the plans differ and
      // the table applies them.
      field: "series_number",
      header: "Series No.",
      render: (row) => row.series_number ?? "—",
    },
    {
      field: "customer_name",
      header: "Payer",
      render: (row) => row.customer_name ?? "—",
    },
    {
      field: "cashier",
      sortKey: "cashier_name",
      header: "Cashier",
      render: (row) => row.cashier?.full_name ?? "—",
    },
    {
      field: "total",
      header: "Total",
      render: (row) => (row.total === null ? "—" : formatCurrency(row.total)),
    },
  ];

  if (includeAmounts) {
    columns.push(
      {
        field: "amount_paid",
        header: "Amount Paid",
        render: (row) => formatCurrency(row.amount_paid),
      },
      {
        field: "change_amount",
        header: "Change",
        render: (row) => formatCurrency(row.change_amount),
      },
    );
  }

  return columns;
}
