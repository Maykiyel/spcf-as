import { createListAdapter } from "@/components/ui/data-table";
import type { ItemCode } from "@/api/item-codes";
import type { SortPlan } from "@/components/ui/data-table";

// For the paginated admin table (ItemCodeTable / useServerTableState).
export const getItemCodes = createListAdapter<ItemCode>(
  "/item-codes",
  "item_codes",
  { supportsSearch: true },
);

/** Read from `ItemCodeController::index` at backend `0428e2c`:
 * `allowedSorts('name', 'description')`, no `defaultSort`. `description`
 * was missing here until the allow-list was checked against the source, so
 * the Description column offered no sort the endpoint would have served. */
export const ITEM_CODES_SORT_PLAN: SortPlan = {
  allowed: ["name", "description"],
};
