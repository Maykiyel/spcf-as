import { createListAdapter } from "@/components/ui/data-table";
import type { TransactionDTO } from "../types";

// One row is enough — `pagination.total` is what this is for, and it is
// the cheapest count the API offers. `createListAdapter` owns the
// `{transactions, pagination}` envelope so this doesn't re-encode it, and
// `status` goes through the declared-filter path rather than `extra`,
// which is what `filter[<key>]` is for. The row itself is discarded.
const listTransactions = createListAdapter<TransactionDTO>(
  "/transactions",
  "transactions",
);

/**
 * How many transactions the caller currently has `pending`.
 *
 * `POST /transactions` abandons every one of the cashier's pending
 * transactions before creating the new one, and its response does not
 * report what it discarded — so the only way to tell a cashier their work
 * was thrown away is to have looked before. See BACKEND_NOTES.md.
 *
 * `GET /transactions` scopes a cashier to their own rows, which is what
 * makes this the right question. An admin would get everyone's, but an
 * admin cannot create a transaction at all (the server refuses
 * `POST /transactions` from one), so the notice this feeds never fires for
 * them.
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
