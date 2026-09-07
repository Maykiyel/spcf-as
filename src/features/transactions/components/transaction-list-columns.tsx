import type { ReactNode } from "react";
import { Anchor } from "@mantine/core";
import { Link } from "react-router";
import type { ColumnDef, SortEntry } from "@/components/ui/data-table";
import { formatCurrency } from "@/utils/currency";
import { formatTransactionDate } from "../lib/transaction-date";
import type { TransactionListRow } from "../types";
import { TransactionItemNamesCell } from "./transaction-item-names-cell";
import { TransactionStatusBadge } from "./transaction-status-badge";

/** `/transactions` sorts by `-created_at` when asked for nothing.
 * Declaring it puts a caret on the Date header saying so, instead of rows
 * that are plainly newest-first under a column that looks unsorted, which
 * makes the first click on it appear to reverse a sort nobody indicated
 * was there.
 *
 * `created_at` is the endpoint's name for it, and it has to stay equal to
 * the Date column's `sortKey` below. That is why it lives here and not
 * beside the fetcher: the two names that must agree are now three lines
 * apart. It reaches the wire on the first request, so getting it wrong is
 * a 422 before the user touches anything.
 *
 * Both pages that list transactions want the same caret on the same
 * column, so both take this rather than restating it. */
export const TRANSACTIONS_DEFAULT_SORTS: SortEntry[] = [
  { key: "created_at", direction: "desc" },
];

type TransactionListColumnsOptions = {
  /** Whether the Cashier column belongs on this table.
   *
   * The caller decides, because the reason differs by page — the receipts
   * list gates it on the signed-in role, and the Void page is admin-only
   * outright. Same split as `includeCashier` on the filter panel, and for
   * the same reason: `/transactions` scopes a cashier to their own rows, so
   * for them the column is their own name repeated down the page. */
  includeCashier: boolean;
  /** Whether the Status column belongs on this table.
   *
   * `false` where the page has pinned the status, since a column showing
   * the same word on every row is a column carrying no information. */
  includeStatus: boolean;
  /** A trailing Actions column's cell, when the page has a per-row action.
   *
   * Omitted rather than passed empty when there is none: an "Actions"
   * header over blank cells reads as an action that failed to render.
   *
   * `DataTable.Grid`'s row-click handler ignores clicks that land on a
   * button inside a row, so a page can pair this with `onRowClick` without
   * the action doubling as a navigation. */
  actions?: (row: TransactionListRow) => ReactNode;
};

/**
 * The columns of a `/transactions` list, shared by every page that renders
 * one.
 *
 * Two pages do today: the receipts list (#61) and the Void page (#62). They
 * differ in three ways and nothing else, which is exactly the three options
 * above — the remaining six columns, their formatting and their sort names
 * are the same table either way, and the second page was specified to reuse
 * the first rather than restate it.
 *
 * **Only the four keys `/transactions` allow-lists are marked sortable** —
 * `created_at`, `status`, `customer` and `series_number`. Anything else is
 * a 422 on the first header click. Two of them are named through `sortKey`,
 * because the endpoint returns those columns in fields called something
 * else.
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
      // A real link, not just a row that happens to be clickable. It is
      // what a keyboard reaches and a screen reader announces, and what
      // makes middle-click and open-in-new-tab work; a page's `onRowClick`
      // is the mouse affordance layered over it.
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
      // `null` until the transaction is saved. Always present on a page
      // pinned to `completed`, but the receipts list shows every status, so
      // the empty case is real and the column renders it either way.
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
      // Not sortable: `/transactions` allow-lists no cashier sort.
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
      // `key` is constrained to a field of the row, so the identifying one
      // stands in and `id` names the column. Same shape the item codes,
      // services and accounts tables use for their action columns.
      key: "control_id",
      id: "actions",
      header: "Actions",
      render: actions,
    });
  }

  return columns;
}
