import {
  createListAdapter,
  type SortPlan,
} from "@/components/ui/data-table";
import type { Cashier } from "@/api/cashiers";
import type { SeriesReceipt } from "../types";

/** The row as `GET /series-receipts` sends it: `SeriesReceipt` with the
 * backend's `account` in place of the renamed `cashier`. */
type SeriesReceiptWireRow = Omit<SeriesReceipt, "cashier"> & {
  account: Cashier;
};

/**
 * One page of the series receipts.
 *
 * Renames `account` to `cashier`, the way `getUserAccounts` renames
 * `user_name`: the field always meant the assigned cashier, and the word
 * `account` collides with the unrelated Accounts nav group. The wire keeps
 * its own name in the sort plan below.
 */
export const getSeriesReceipts = createListAdapter<
  SeriesReceiptWireRow,
  SeriesReceipt
>("/series-receipts", "series_receipts", {
  supportsSearch: true,
  selectRow: ({ account, ...row }) => ({ ...row, cashier: account }),
});

/** Read from `SeriesReceiptController::index` at backend `0428e2c`: `from`,
 * `to`, `remaining_sheets`, and `account` as an `AllowedSort::custom` over
 * the assigned cashier's name. No `defaultSort`. `account` is the wire's
 * word for the cashier and stays the sort key; the column reaches it
 * through `sortKey` rather than by being named for it. */
export const SERIES_RECEIPTS_SORT_PLAN: SortPlan = {
  allowed: ["account", "from", "to", "remaining_sheets"],
};
