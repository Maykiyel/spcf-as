import { useQuery } from "@tanstack/react-query";
import {
  DataTable,
  useClientTableState,
  type ColumnDef,
} from "@/components/ui/data-table";
import { getSuppliers } from "../api/get-suppliers";
import { SupplierActionsCell } from "./supplier-actions-cell";
import type { Supplier } from "../types";

type SupplierTableProps = {
  onEdit: (supplier: Supplier) => void;
};

export function SupplierTable({ onEdit }: SupplierTableProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: getSuppliers,
  });

  const columns: ColumnDef<Supplier>[] = [
    { key: "id", header: "ID", sortable: true },
    { key: "name", header: "Supplier Name", sortable: true },
    { key: "contact_no", header: "Contact No", sortable: true },
    { key: "email", header: "Email Address", sortable: true },
    {
      key: "id",
      id: "actions",
      header: "Actions",
      render: (row) => <SupplierActionsCell supplier={row} onEdit={onEdit} />,
    },
  ];

  const tableState = useClientTableState({ data: data ?? [], columns });

  return (
    <DataTable.Root
      title="List of Supplier"
      state={{ ...tableState, isLoading }}
    >
      <DataTable.Toolbar />
      <DataTable.Grid />
      <DataTable.Pagination />
    </DataTable.Root>
  );
}
