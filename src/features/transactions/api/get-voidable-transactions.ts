import { createListAdapter } from "@/components/ui/data-table";
import type { TransactionListRow } from "../types";

/** The only status `POST /void` accepts; every other one is a 409. */
const VOIDABLE_STATUS = "completed";

/**
 * One page of the transactions an admin may void.
 *
 * Pinned rather than declared as a filter defaulting to `completed`:
 * declared filters are read out of the URL, so `?void_status=pending` would
 * fill the page with rows whose Void button can only 409. A pinned filter is
 * past the last point the URL reaches.
 *
 * Its own adapter on the same endpoint as `getTransactions`, so the two keep
 * separate query keys and neither serves the other's cached rows.
 */
export const getVoidableTransactions = createListAdapter<TransactionListRow>(
  "/transactions",
  "transactions",
  { pinnedFilters: { status: VOIDABLE_STATUS } },
);
