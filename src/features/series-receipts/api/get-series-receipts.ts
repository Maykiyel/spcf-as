import { createListAdapter } from "@/components/ui/data-table";
import type { SeriesReceipt } from "../types";
import type { SortPlan } from "@/components/ui/data-table";

export const getSeriesReceipts = createListAdapter<SeriesReceipt>(
  "/series-receipts",
  "series_receipts",
  { supportsSearch: true },
);

/** Not documented in `BACKEND_NOTES.md`: transcribed from the four keys
 * this table has always sorted under. `account` is the backend's name for
 * the assigned cashier — see CONTEXT.md — and stays the wire key here. */
export const SERIES_RECEIPTS_SORT_PLAN: SortPlan = {
  allowed: ["account", "from", "to", "remaining_sheets"],
};
