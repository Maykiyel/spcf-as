import { createListAdapter } from "@/components/ui/data-table";
import type { ItemCode } from "@/api/item-codes";
import type { SortPlan } from "@/components/ui/data-table";

// For the paginated admin table (ItemCodeTable / useServerTableState).
export const getItemCodes = createListAdapter<ItemCode>(
  "/item-codes",
  "item_codes",
  { supportsSearch: true },
);

/** Not documented in `BACKEND_NOTES.md`: transcribed from the one key this
 * catalog has always sorted under. Check against the backend before adding
 * another. */
export const ITEM_CODES_SORT_PLAN: SortPlan = {
  allowed: ["name"],
};
