import { useQuery } from "@tanstack/react-query";
import {
  DataTable,
  useClientTableState,
  type ColumnDef,
  type DataTableContextValue,
} from "@/components/ui/data-table";
import { getItemCodes } from "../api/get-item-codes";
import { ItemCodeActionsCell } from "./item-code-actions-cell";
import type { ItemCode } from "../types";

type ItemCodeTableProps = {
  onEdit: (itemCode: ItemCode) => void;
};

export function ItemCodeTable({ onEdit }: ItemCodeTableProps) {
  const query = useQuery({
    queryKey: ["item-codes"],
    queryFn: getItemCodes,
  });

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

  const clientState = useClientTableState({
    data: query.data ?? [],
    columns,
    urlKey: "item_codes",
  });

  const tableState: DataTableContextValue<ItemCode> = {
    ...clientState,
    isLoading: query.isLoading,
    isError: query.isError,
    errorMessage: query.isError
      ? "Couldn't load item codes. Please try again."
      : null,
  };

  return (
    <DataTable.Root title="Item Codes" state={tableState}>
      <DataTable.Toolbar />
      <DataTable.Grid />
      <DataTable.Pagination />
    </DataTable.Root>
  );
}
