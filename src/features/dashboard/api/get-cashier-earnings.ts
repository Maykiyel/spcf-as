import {
  createListAdapter,
  type SortPlan,
} from "@/components/ui/data-table";
import type { CashierEarnings } from "../types";

/** The row as `/reports/cashier-earnings` sends it. */
type CashierEarningsWireRow = {
  id: number;
  full_name: string;
  total_earnings: number;
};

/**
 * Renames `full_name` to `cashier_name` on the way in, which is not
 * cosmetic: a column's sort key must be a word the endpoint allow-lists,
 * and this one allow-lists `cashier_name`. A column reading `full_name`
 * would render fine and 400 on the first sort click. `CONTEXT.md` records
 * the same trap from the other direction.
 *
 * No search: `/reports/*` accepts no `filter[search]`, and an unknown key
 * is a 400.
 */
export const getCashierEarnings = createListAdapter<
  CashierEarningsWireRow,
  CashierEarnings
>("/reports/cashier-earnings", "earnings_per_cashier", {
  selectRow: ({ full_name, ...row }) => ({ ...row, cashier_name: full_name }),
});

/** `BACKEND_NOTES.md`: sorts are `total_earnings` and `cashier_name`,
 * default `-total_earnings`. Declared rather than left implicit, so the
 * first click on Total Earnings doesn't look like it reversed a sort nobody
 * declared. `cashier_name` is why the fetcher renames `full_name`. */
export const CASHIER_EARNINGS_SORT_PLAN: SortPlan = {
  allowed: ["total_earnings", "cashier_name"],
  default: [{ key: "total_earnings", direction: "desc" }],
};
