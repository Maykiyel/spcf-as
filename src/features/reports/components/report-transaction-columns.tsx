import { Anchor } from "@mantine/core";
import { Link } from "react-router";
import {
  columnSortKey,
  type ColumnDef,
  type SortPlan,
} from "@/components/ui/data-table";
import type { TransactionScalars } from "@/api/transactions";
import { formatCurrency } from "@/utils/currency";
import { formatDateTime } from "@/utils/date-time";

type ReportTransactionColumnsOptions = {
  /** The endpoint these columns are for. Sortability is read off its plan
   * rather than declared per column, because the two endpoints sharing this
   * builder allow-list different keys. Safe to derive here, unlike
   * generally: every column below names a real wire field, so none borrows
   * an identity key that derivation would mistake for a sortable one. */
  plan: SortPlan;
  /** `amount_paid` and `change_amount`, which the breakdown doesn't show at
   * all. A column difference, unlike the sorts. */
  includeAmounts: boolean;
};

/** The columns of a report over `TransactionScalars`, shared by the
 * Transactions Report and the Service Breakdown. */
export function reportTransactionColumns({
  plan,
  includeAmounts,
}: ReportTransactionColumnsOptions): ColumnDef<TransactionScalars>[] {
  const columns: ColumnDef<TransactionScalars>[] = [
    {
      key: "date",
      sortKey: "created_at",
      header: "Date",
      render: (row) => formatDateTime(row.date),
    },
    {
      key: "control_id",
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
      // Shown on both reports, sortable on only one. The two were the same
      // decision while sortability was declared here, which is why
      // `/reports/transactions` used to withhold a number it returns.
      key: "series_number",
      header: "Series No.",
      render: (row) => row.series_number ?? "—",
    },
    {
      key: "customer_name",
      header: "Payer",
      render: (row) => row.customer_name ?? "—",
    },
    {
      key: "cashier",
      sortKey: "cashier_name",
      header: "Cashier",
      render: (row) => row.cashier?.full_name ?? "—",
    },
    {
      key: "total",
      header: "Total",
      render: (row) => (row.total === null ? "—" : formatCurrency(row.total)),
    },
  ];

  if (includeAmounts) {
    columns.push(
      {
        key: "amount_paid",
        header: "Amount Paid",
        render: (row) => formatCurrency(row.amount_paid),
      },
      {
        key: "change_amount",
        header: "Change",
        render: (row) => formatCurrency(row.change_amount),
      },
    );
  }

  return columns.map((column) => ({
    ...column,
    sortable: plan.allowed.includes(columnSortKey(column)),
  }));
}
