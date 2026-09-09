import type { SortEntry } from "@/components/ui/data-table";
import { reportTransactionColumns } from "./report-transaction-columns";

/** Both halves of the endpoint's own `defaultSort`, which is
 * `-created_at, id`. The tiebreaker is not decoration: sending any `sort`
 * suppresses the server's default, and two transactions sharing a
 * `created_at` would then have undefined order across pages. */
export const TRANSACTION_REPORT_DEFAULT_SORTS: SortEntry[] = [
  { key: "created_at", direction: "desc" },
  { key: "id", direction: "asc" },
];

/** The columns of `GET /reports/transactions`. Its sort allow-list is not
 * `/transactions`': `customer_name` rather than `customer`, `cashier_name`
 * allowed here, and no `series_number` sort at all. */
export const transactionReportColumns = reportTransactionColumns({
  includeSeriesNumber: false,
  includeAmounts: true,
});
