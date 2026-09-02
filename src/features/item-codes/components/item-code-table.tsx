import {
  DataTable,
  useServerTableState,
  type ColumnDef,
} from "@/components/ui/data-table";
import { getItemCodes } from "../api/get-item-codes";
import { ItemCodeActionsCell } from "./item-code-actions-cell";
import type { ItemCode } from "@/api/item-codes";

type ItemCodeTableProps = {
  onEdit: (itemCode: ItemCode) => void;
};

export function ItemCodeTable({ onEdit }: ItemCodeTableProps) {
  const columns: ColumnDef<ItemCode>[] = [
    { key: "name", header: "Item Code", sortable: true },
    { key: "description", header: "Description" },
    {
      key: "id",
      id: "actions",
      header: "Actions",
      render: (row) => <ItemCodeActionsCell itemCode={row} onEdit={onEdit} />,
    },
  ];

  const tableState = useServerTableState({
    queryKey: ["item-codes"],
    queryFn: getItemCodes,
    columns,
    urlKey: "item_codes",
  });

  return (
    <DataTable.Root title="Item Codes" state={tableState}>
      <DataTable.Toolbar>
        <DataTable.PageSize />
        <DataTable.Search />
      </DataTable.Toolbar>
      <DataTable.Grid />
      <DataTable.Pagination />
    </DataTable.Root>
  );
}
