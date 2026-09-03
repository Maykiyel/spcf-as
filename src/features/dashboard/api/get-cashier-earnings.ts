import {
  createListAdapter,
  type ServerTableParams,
  type ServerTableResponse,
} from "@/components/ui/data-table";
import type { CashierEarnings } from "../types";

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
 * Renames `full_name` to `cashier_name` on the way in.
 *
 * Not cosmetic. A `ColumnDef`'s `key` does two jobs: it decides which
 * field the cell reads, and it is the word sent as `sort` when someone
 * clicks that column's header. The endpoint allow-lists `cashier_name`
 * and `total_earnings`, so a column keyed `full_name` would render
 * correctly and then answer the first sort click with a 400.
 *
 * `CONTEXT.md` records the same trap from the other direction on the
 * Series Receipts table, where the backend's name won and the column had
 * to keep it. Here the endpoint's read and sort names differ from each
 * other, so one of them has to be translated, and the boundary is the
 * only place it can happen once.
 *
 * No `search`: `/reports/*` accepts no `filter[search]`, and an unknown
 * filter key is a 400 here rather than an ignored parameter — which is
 * why the adapter is not opted into search and the table composes no
 * search box.
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
