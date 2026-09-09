import {
  createListAdapter,
  type ServerTableParams,
  type ServerTableResponse,
  type SortPlan,
} from "@/components/ui/data-table";
import type { Cashier } from "@/api/cashiers";
import type { SeriesReceipt } from "../types";

/** The row as `GET /series-receipts` sends it: `SeriesReceipt` with the
 * backend's `account` in place of the renamed `cashier`. */
type SeriesReceiptWireRow = Omit<SeriesReceipt, "cashier"> & {
  account: Cashier;
};

const listSeriesReceipts = createListAdapter<SeriesReceiptWireRow>(
  "/series-receipts",
  "series_receipts",
  { supportsSearch: true },
);

/**
 * One page of the series receipts.
 *
 * Renames `account` to `cashier`, the way `getUserAccounts` renames
 * `user_name`: the field always meant the assigned cashier, and the word
 * `account` collides with the unrelated Accounts nav group. The wire keeps
 * its own name in the sort plan below.
 */
export const getSeriesReceipts = async (
  params: ServerTableParams,
): Promise<ServerTableResponse<SeriesReceipt>> => {
  const response = await listSeriesReceipts(params);

  return {
    total: response.total,
    data: response.data.map(({ account, ...row }) => ({
      ...row,
      cashier: account,
    })),
  };
};

/** Not documented in `BACKEND_NOTES.md`: transcribed from the four keys
 * this table has always sorted under. `account` is the wire's name for the
 * assigned cashier and stays the sort key; the column reaches it through
 * `sortKey` rather than by being named for it. */
export const SERIES_RECEIPTS_SORT_PLAN: SortPlan = {
  allowed: ["account", "from", "to", "remaining_sheets"],
};
