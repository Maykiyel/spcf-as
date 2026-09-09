import { createListAdapter } from "@/components/ui/data-table";
import type { TransactionReportRow } from "../types";
import type { SortPlan } from "@/components/ui/data-table";

/** `total_earnings` is computed server-side across the whole filtered set, so
 * it is read off the envelope; summing the visible page answers a different
 * question. No `supportsSearch`: an unknown filter key here is a 400. */
export const getTransactionReport = createListAdapter<
  TransactionReportRow,
  number
>("/reports/transactions", "transactions", {
  selectMeta: (body) => body.total_earnings as number,
});

/** `BACKEND_NOTES.md`: sorts are `created_at`, `id`, `customer_name`,
 * `total`, `amount_paid`, `change_amount`, `cashier_name`, default
 * `-created_at, id`. The tiebreaker is not decoration: any `sort` param
 * suppresses the server's default outright, so two transactions sharing a
 * `created_at` would otherwise have undefined order across pages. */
export const TRANSACTION_REPORT_SORT_PLAN: SortPlan = {
  allowed: [
    "created_at",
    "id",
    "customer_name",
    "total",
    "amount_paid",
    "change_amount",
    "cashier_name",
  ],
  unique: ["id"],
  default: [
    { key: "created_at", direction: "desc" },
    { key: "id", direction: "asc" },
  ],
};
