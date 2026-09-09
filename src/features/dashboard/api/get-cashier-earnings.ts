import {
  createListAdapter,
  type ServerTableParams,
  type ServerTableResponse,
} from "@/components/ui/data-table";
import type { CashierEarnings } from "../types";
import type { SortPlan } from "@/components/ui/data-table";

/** The row as `/reports/cashier-earnings` sends it. */
type CashierEarningsWireRow = {
  id: number;
  full_name: string;
  total_earnings: number;
};

const listCashierEarnings = createListAdapter<CashierEarningsWireRow>(
  "/reports/cashier-earnings",
  "earnings_per_cashier",
);

/**
 * Renames `full_name` to `cashier_name` on the way in, which is not
 * cosmetic: a `ColumnDef`'s `key` is both the field a cell reads and the
 * word sent as `sort`, and the endpoint allow-lists `cashier_name`. A
 * column keyed `full_name` would render fine and 400 on the first sort
 * click. `CONTEXT.md` records the same trap from the other direction.
 *
 * No search: `/reports/*` accepts no `filter[search]`, and an unknown key
 * is a 400.
 */
export const getCashierEarnings = async (
  params: ServerTableParams,
): Promise<ServerTableResponse<CashierEarnings>> => {
  const response = await listCashierEarnings(params);

  return {
    total: response.total,
    data: response.data.map((row) => ({
      id: row.id,
      cashier_name: row.full_name,
      total_earnings: row.total_earnings,
    })),
  };
};

/** `BACKEND_NOTES.md`: sorts are `total_earnings` and `cashier_name`,
 * default `-total_earnings`. Declared rather than left implicit, so the
 * first click on Total Earnings doesn't look like it reversed a sort nobody
 * declared. `cashier_name` is why the fetcher renames `full_name`. */
export const CASHIER_EARNINGS_SORT_PLAN: SortPlan = {
  allowed: ["total_earnings", "cashier_name"],
  default: [{ key: "total_earnings", direction: "desc" }],
};
