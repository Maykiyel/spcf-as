import {
  createListAdapter,
  type ServerTableParams,
  type SortPlan,
} from "@/components/ui/data-table";
import { stripSeriesNumberPadding } from "@/utils/series-number";
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
const listSeriesReceipts = createListAdapter<
  SeriesReceiptWireRow,
  SeriesReceipt
>("/series-receipts", "series_receipts", {
  supportsSearch: true,
  selectRow: ({ account, ...row }) => ({ ...row, cashier: account }),
});

/** The box searches the booklet's bounds, its remaining sheets and the
 * cashier's name, all partially — so the padding a user copied off the
 * From and To columns is stripped here, where this table's request is
 * built. Not in the toolbar's search control: that one is shared and
 * domain-agnostic, and must not learn what a series number is. */
export const getSeriesReceipts = (params: ServerTableParams) =>
  listSeriesReceipts({
    ...params,
    search: params.search && stripSeriesNumberPadding(params.search),
  });

/** Read from `SeriesReceiptController::index` at backend `bfe249f`: `from`,
 * `to`, `remaining_sheets`, and `account` as an `AllowedSort::custom` over
 * the assigned cashier's name. Default `from`. `account` is the wire's
 * word for the cashier and stays the sort key; the column reaches it
 * through `sortKey` rather than by being named for it. */
export const SERIES_RECEIPTS_SORT_PLAN: SortPlan = {
  allowed: ["account", "from", "to", "remaining_sheets"],
};
