import { createListAdapter } from "@/components/ui/data-table";
import type { TransactionListRow } from "../types";
import type { SortPlan } from "@/components/ui/data-table";

/**
 * One page of transactions. A bare adapter: every filter is already named
 * the way the wire names it.
 *
 * No `supportsSearch`: `/transactions` accepts none and an unknown key is
 * a 400, which is why no page here has a search box. The server scopes a
 * cashier to their own rows; the page's only job is to never send a filter
 * the caller isn't allow-listed for.
 */
export const getTransactions = createListAdapter<TransactionListRow>(
  "/transactions",
  "transactions",
);

/** `BACKEND_NOTES.md`: sorts are `created_at`, `status`, `customer` (which
 * maps to `customer_name`) and `series_number`, default `-created_at`. Not
 * the reports' allow-list: the payer sort is `customer` here and
 * `customer_name` there, and no cashier sort is allowed at all. */
export const TRANSACTIONS_SORT_PLAN: SortPlan = {
  allowed: ["created_at", "status", "customer", "series_number"],
  default: [{ key: "created_at", direction: "desc" }],
};
