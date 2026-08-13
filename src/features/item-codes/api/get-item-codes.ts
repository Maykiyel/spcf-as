import { createListAdapter } from "@/components/ui/data-table";
import type { ItemCode } from "@/api/item-codes";

// For the paginated admin table (ItemCodeTable / useServerTableState).
export const getItemCodes = createListAdapter<ItemCode>(
  "/item-codes",
  "item_codes",
);
