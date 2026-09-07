import { createListAdapter } from "@/components/ui/data-table";
import type { TransactionDTO } from "../types";

// One row is enough: `pagination.total` is the whole point and the row is
// discarded. The cheapest count the API offers.
const listTransactions = createListAdapter<TransactionDTO>(
  "/transactions",
  "transactions",
);

/**
 * How many transactions the caller has `pending`.
 *
 * `POST /transactions` abandons the cashier's pending transactions without
 * reporting what it discarded, so the only way to tell them their work was
 * thrown away is to have counted first. See BACKEND_NOTES.md.
 */
export const getPendingTransactionCount = async (): Promise<number> => {
  const { total } = await listTransactions({
    page: 1,
    per_page: 1,
    sorts: [],
    filters: { status: "pending" },
  });

  return total;
};
