import { DataTable, useServerTableState } from "@/components/ui/data-table";
import { getItemCodes, ITEM_CODES_SORT_PLAN } from "../api/get-item-codes";
import { itemCodeColumns } from "./item-code-columns";
import type { ItemCode } from "@/api/item-codes";

type ItemCodeTableProps = {
  onEdit: (itemCode: ItemCode) => void;
};

export function ItemCodeTable({ onEdit }: ItemCodeTableProps) {
  const tableState = useServerTableState({
    queryKey: ["item-codes"],
    queryFn: getItemCodes,
    columns: itemCodeColumns({ onEdit }),
    urlKey: "item_codes",
    sortPlan: ITEM_CODES_SORT_PLAN,
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
