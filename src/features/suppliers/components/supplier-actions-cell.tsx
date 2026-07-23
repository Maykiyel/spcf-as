import { EditButton } from "@/components/ui/button";
import type { Supplier } from "../types";

type SupplierActionsCellProps = {
  supplier: Supplier;
  onEdit: (supplier: Supplier) => void;
};

export function SupplierActionsCell({
  supplier,
  onEdit,
}: SupplierActionsCellProps) {
  return (
    <EditButton
      onClick={() => {
        onEdit(supplier);
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "smooth",
        });
      }}
    />
  );
}
