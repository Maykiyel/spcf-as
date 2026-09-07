import { createListAdapter } from "@/components/ui/data-table";
import type { TransactionListRow } from "../types";

/** The prefix every cache entry for the transaction list starts with.
 * `useServerTableState` appends the page, size, sorts and filters, so this
 * is a prefix rather than a whole key — which is what `invalidateQueries`
 * matches on, so #62's void mutation will need no change here. */
export const TRANSACTIONS_QUERY_KEY = ["transactions"] as const;

/**
 * One page of transactions.
 *
 * A bare list adapter: `/transactions` returns the same
 * `{transactions, pagination}` envelope every list endpoint here does, and
 * every filter this page declares is already named the way the wire names
 * it, so there is nothing to translate on the way out.
 *
 * **No `supportsSearch`.** `/transactions` accepts no `filter[search]`, and
 * an unknown filter key is a 400 rather than an ignored parameter — which
 * is why the page composes no search box either. Its seven filters are
 * what narrows it.
 *
 * **Rows are scoped by the server.** A cashier's request is narrowed to
 * their own transactions before any filter applies, and `filter[cashier_id]`
 * isn't even in their allow-list — it is a 400 for them, not a silently
 * ignored parameter. Neither rule is re-implemented here; the page's job is
 * only to never send a filter the caller isn't allowed to.
 *
 * **The sort names are the endpoint's, not the row's.** `date` sorts as
 * `created_at` and `customer_name` as `customer`, which the columns declare
 * through `sortKey` rather than this fetcher rewriting them — see
 * `ColumnDef` in `components/ui/data-table/types.ts`.
 */
export const getTransactions = createListAdapter<TransactionListRow>(
  "/transactions",
  "transactions",
);
