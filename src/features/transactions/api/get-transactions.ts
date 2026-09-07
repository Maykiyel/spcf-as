import { createListAdapter } from "@/components/ui/data-table";
import type { TransactionListRow } from "../types";

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
