import {
  DataTable,
  useServerTableState,
  type ColumnDef,
} from "@/components/ui/data-table";
import { getSuppliers } from "../api/get-suppliers";
import { SupplierActionsCell } from "./supplier-actions-cell";
import type { Supplier } from "../types";

type SupplierTableProps = {
  onEdit: (supplier: Supplier) => void;
};

export function SupplierTable({ onEdit }: SupplierTableProps) {
  const columns: ColumnDef<Supplier>[] = [
    { key: "id", header: "ID", sortable: true },
    { key: "name", header: "Supplier Name", sortable: true },
    { key: "contact_no", header: "Contact No" },
    { key: "email", header: "Email Address", sortable: true },
    {
      key: "id",
      id: "actions",
      header: "Actions",
      render: (row) => <SupplierActionsCell supplier={row} onEdit={onEdit} />,
    },
  ];

  const tableState = useServerTableState({
    queryKey: ["suppliers"],
    queryFn: getSuppliers,
    columns,
  });

  return (
    <DataTable.Root title="List of Supplier" state={tableState}>
      <DataTable.Toolbar />
      <DataTable.Grid />
      <DataTable.Pagination />
    </DataTable.Root>
  );
}
