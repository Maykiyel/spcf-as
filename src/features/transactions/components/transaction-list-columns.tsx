import type { ReactNode } from "react";
import { Anchor } from "@mantine/core";
import { Link } from "react-router";
import type { ColumnDef } from "@/components/ui/data-table";
import { formatCurrency } from "@/utils/currency";
import { formatDateTime } from "@/utils/date-time";
import type { TransactionListRow } from "../types";
import { TransactionItemNamesCell } from "./transaction-item-names-cell";
import { TransactionStatusBadge } from "./transaction-status-badge";

type TransactionListColumnsOptions = {
  /** The caller decides, since the reason differs by page: the receipts
   * list gates it on role, the Void page is admin-only outright. */
  includeCashier: boolean;
  /** `false` where the page has pinned the status, since a column showing
   * one word on every row carries no information. */
  includeStatus: boolean;
  /** A trailing Actions column's cell. Omitted rather than passed empty:
   * an "Actions" header over blank cells reads as a render failure. */
  actions?: (row: TransactionListRow) => ReactNode;
};

/**
 * The columns of a `/transactions` list, shared by the receipts list and
 * the Void page, which differ only in the three options above.
 *
 * Only the four keys `TRANSACTIONS_SORT_PLAN` allow-lists are `sortable`;
 * anything else is a 422 on the first header click. Two are named through
 * `sortKey` because the endpoint returns them in differently named fields.
 */
export function transactionListColumns({
  includeCashier,
  includeStatus,
  actions,
}: TransactionListColumnsOptions): ColumnDef<TransactionListRow>[] {
  const columns: ColumnDef<TransactionListRow>[] = [
    {
      field: "date",
      sortKey: "created_at",
      header: "Date",
      render: (row) => formatDateTime(row.date),
    },
    {
      field: "control_id",
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
      field: "series_number",
      header: "Series No.",
      // `null` until saved, which the receipts list does show.
      render: (row) => row.series_number ?? "—",
    },
    {
      field: "customer_name",
      sortKey: "customer",
      header: "Payer",
      render: (row) => row.customer_name ?? "—",
    },
  ];

  if (includeCashier) {
    columns.push({
      field: "cashier",
      header: "Cashier",
      // Not sortable: the endpoint allow-lists no cashier sort.
      render: (row) => row.cashier?.full_name ?? "—",
    });
  }

  columns.push(
    {
      field: "items",
      header: "Items",
      render: (row) => <TransactionItemNamesCell items={row.items} />,
    },
    {
      field: "total",
      header: "Total",
      render: (row) => (row.total === null ? "—" : formatCurrency(row.total)),
    },
  );

  if (includeStatus) {
    columns.push({
      field: "status",
      header: "Status",
      render: (row) => <TransactionStatusBadge status={row.status} />,
    });
  }

  if (actions) {
    columns.push({
      id: "actions",
      header: "Actions",
      render: actions,
    });
  }

  return columns;
}
