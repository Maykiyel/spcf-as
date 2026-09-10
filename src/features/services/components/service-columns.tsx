import type { ColumnDef } from "@/components/ui/data-table";
import type { Service } from "@/api/services";
import { ServiceActiveToggle } from "./service-active-toggle";
import { ServiceActionsCell } from "./service-actions-cell";

type ServiceColumnsOptions = {
  onEdit: (service: Service) => void;
};

/** A builder rather than a constant only because the Actions cell closes
 * over `onEdit`. Description shows without a sort: `/services` allow-lists
 * `item_code`, `name` and `price`, and will not order by anything else. */
export function serviceColumns({
  onEdit,
}: ServiceColumnsOptions): ColumnDef<Service>[] {
  return [
    {
      field: "item_code",
      header: "Item Code",
      render: (row) => row.item_code?.name ?? "",
    },
    { field: "name", header: "Service" },
    {
      field: "description",
      header: "Description",
      render: (row) => row.description ?? "—",
    },
    {
      field: "price",
      header: "Price",
      render: (row) => `₱${row.price.toFixed(2)}`,
    },
    {
      id: "is_active",
      header: "Active",
      render: (row) => <ServiceActiveToggle service={row} />,
    },
    {
      id: "actions",
      header: "Actions",
      render: (row) => <ServiceActionsCell service={row} onEdit={onEdit} />,
    },
  ];
}
