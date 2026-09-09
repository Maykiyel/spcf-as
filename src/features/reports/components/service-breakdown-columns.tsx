import type { SortEntry } from "@/components/ui/data-table";
import { reportTransactionColumns } from "./report-transaction-columns";

/** The endpoint's own `defaultSort`, which is `id` alone. One key is the
 * whole of it here, and `id` is unique, so it needs no tiebreaker. */
export const SERVICE_BREAKDOWN_DEFAULT_SORTS: SortEntry[] = [
  { key: "id", direction: "asc" },
];

/** The columns of `GET /reports/services-sold/{service}`. Its sort
 * allow-list is a third distinct one: `series_number` is allowed here and
 * not on `/reports/transactions`, which allows two amount sorts this omits. */
export const serviceBreakdownColumns = reportTransactionColumns({
  includeSeriesNumber: true,
  includeAmounts: false,
});
