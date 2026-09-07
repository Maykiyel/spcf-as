import type { ReactNode } from "react";
import { Anchor } from "@mantine/core";
import { Link } from "react-router";
import type { ColumnDef, SortEntry } from "@/components/ui/data-table";
import { formatCurrency } from "@/utils/currency";
import { formatTransactionDate } from "../lib/transaction-date";
import type { TransactionListRow } from "../types";
import { TransactionItemNamesCell } from "./transaction-item-names-cell";
import { TransactionStatusBadge } from "./transaction-status-badge";

/** `/transactions` sorts by `-created_at` when asked for nothing, so
 * declaring it puts a caret on the Date header rather than leaving rows
 * plainly ordered under a column that looks unsorted. Must stay equal to
 * the Date column's `sortKey` below, which is why it lives here. */
export const TRANSACTIONS_DEFAULT_SORTS: SortEntry[] = [
  { key: "created_at", direction: "desc" },
];

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
 * Only the four keys the endpoint allow-lists are `sortable`; anything
 * else is a 422 on the first header click. Two are named through `sortKey`
 * because the endpoint returns them in differently named fields.
 */
export function transactionListColumns({
  includeCashier,
  includeStatus,
  actions,
}: TransactionListColumnsOptions): ColumnDef<TransactionListRow>[] {
  const columns: ColumnDef<TransactionListRow>[] = [
    {
      key: "date",
      sortKey: "created_at",
      header: "Date",
      sortable: true,
      render: (row) => formatTransactionDate(row.date),
    },
    {
      key: "control_id",
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
      key: "series_number",
      header: "Series No.",
      sortable: true,
      // `null` until saved, which the receipts list does show.
      render: (row) => row.series_number ?? "—",
    },
    {
      key: "customer_name",
      sortKey: "customer",
      header: "Payer",
      sortable: true,
      render: (row) => row.customer_name ?? "—",
    },
  ];

  if (includeCashier) {
    columns.push({
      key: "cashier",
      header: "Cashier",
      // Not sortable: the endpoint allow-lists no cashier sort.
      render: (row) => row.cashier?.full_name ?? "—",
    });
  }

  columns.push(
    {
      key: "items",
      header: "Items",
      render: (row) => <TransactionItemNamesCell items={row.items} />,
    },
    {
      key: "total",
      header: "Total",
      render: (row) => (row.total === null ? "—" : formatCurrency(row.total)),
    },
  );

  if (includeStatus) {
    columns.push({
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <TransactionStatusBadge status={row.status} />,
    });
  }

  if (actions) {
    columns.push({
      // `key` must be a field of the row, so the identifying one stands in
      // and `id` names the column. Same shape as the other action columns.
      key: "control_id",
      id: "actions",
      header: "Actions",
      render: actions,
    });
  }

  return columns;
}
