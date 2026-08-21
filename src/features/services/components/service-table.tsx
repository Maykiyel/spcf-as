import {
  DataTable,
  useServerTableState,
  type ColumnDef,
  type ServerTableParams,
  type ServerTableResponse,
} from "@/components/ui/data-table";
import { getServices } from "../api/get-services";
import { ServiceActiveToggle } from "./service-active-toggle";
import { ServiceActionsCell } from "./service-actions-cell";
import { ServiceStatusFilter } from "./service-status-filter";
import { useServiceStatusFilter } from "./use-service-status-filter";
import type { Service } from "@/api/services";

type ServiceTableProps = {
  onEdit: (service: Service) => void;
};

const URL_KEY = "services";

export function ServiceTable({ onEdit }: ServiceTableProps) {
  const { isActive } = useServiceStatusFilter(URL_KEY);

  const columns: ColumnDef<Service>[] = [
    {
      key: "item_code",
      header: "Item Code",
      sortable: true,
      render: (row) => row.item_code?.name ?? "",
    },
    { key: "name", header: "Service", sortable: true },
    {
      key: "description",
      header: "Description",
      render: (row) => row.description ?? "—",
    },
    {
      key: "price",
      header: "Price",
      sortable: true,
      render: (row) => `₱${row.price.toFixed(2)}`,
    },
    {
      key: "id",
      id: "is_active",
      header: "Active",
      render: (row) => <ServiceActiveToggle service={row} />,
    },
    {
      key: "id",
      id: "actions",
      header: "Actions",
      render: (row) => <ServiceActionsCell service={row} onEdit={onEdit} />,
    },
  ];

  const queryFn = (
    params: ServerTableParams,
  ): Promise<ServerTableResponse<Service>> => getServices(params, isActive);

  const tableState = useServerTableState({
    queryKey: ["services", isActive],
    queryFn,
    columns,
    urlKey: URL_KEY,
  });

  return (
    <DataTable.Root title="Services" state={tableState}>
      <DataTable.Toolbar filters={<ServiceStatusFilter urlKey={URL_KEY} />} />
      <DataTable.Grid />
      <DataTable.Pagination />
    </DataTable.Root>
  );
}
