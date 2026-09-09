import { Anchor } from "@mantine/core";
import { Link } from "react-router";
import type { ColumnDef, SortEntry } from "@/components/ui/data-table";
import { formatCurrency } from "@/utils/currency";
import { formatDateTime } from "@/utils/date-time";
import type { ServiceBreakdownRow } from "../types";

/** The endpoint's own `defaultSort`, which is `id` alone. One key is the
 * whole of it here, and `id` is unique, so it needs no tiebreaker. */
export const SERVICE_BREAKDOWN_DEFAULT_SORTS: SortEntry[] = [
  { key: "id", direction: "asc" },
];

/** The columns of `GET /reports/services-sold/{service}`. Its sort
 * allow-list is a third distinct one: `series_number` is allowed here and
 * not on `/reports/transactions`, which allows two amount sorts this omits. */
export const serviceBreakdownColumns: ColumnDef<ServiceBreakdownRow>[] = [
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
    key: "series_number",
    header: "Series No.",
    sortable: true,
    render: (row) => row.series_number ?? "—",
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
];
