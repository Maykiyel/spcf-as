import type { ColumnDef } from "@/components/ui/data-table";
import type { ItemCode } from "@/api/item-codes";
import { ItemCodeActionsCell } from "./item-code-actions-cell";

type ItemCodeColumnsOptions = {
  onEdit: (itemCode: ItemCode) => void;
};

/** A builder rather than a constant only because the Actions cell closes
 * over `onEdit`. Both Item Code and Description sort: `/item-codes`
 * allow-lists `name` and `description`, and sortability derives from that. */
export function itemCodeColumns({
  onEdit,
}: ItemCodeColumnsOptions): ColumnDef<ItemCode>[] {
  return [
    { field: "name", header: "Item Code" },
    { field: "description", header: "Description" },
    {
      id: "actions",
      header: "Actions",
      render: (row) => <ItemCodeActionsCell itemCode={row} onEdit={onEdit} />,
    },
  ];
}
