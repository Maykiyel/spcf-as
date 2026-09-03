import { Divider } from "@mantine/core";
import {
  DataTable,
  useServerTableState,
  type ColumnDef,
} from "@/components/ui/data-table";
import { getServices } from "../api/get-services";
import { ServiceActiveToggle } from "./service-active-toggle";
import { ServiceActionsCell } from "./service-actions-cell";
import { ServiceStatusFilter } from "./service-status-filter";
import type { Service } from "@/api/services";

type ServiceTableProps = {
  onEdit: (service: Service) => void;
};

const URL_KEY = "services";

/** `is_active` is the only filter this table declares, and `null` is what
 * it sends when unfiltered. Module scope, not rebuilt per render:
 * `useServerTableState` keys its query on this object. */
const INITIAL_FILTERS = { is_active: null };

export function ServiceTable({ onEdit }: ServiceTableProps) {
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

  // `["services"]` is a prefix, not the whole key — the hook appends the
  // page, size, search, sorts and filters. The filter is no longer named
  // here by hand, which is the point: it was in the request but not in the
  // key, so a stale page of the previous filter's rows could be served
  // with no error at all.
  const tableState = useServerTableState({
    queryKey: ["services"],
    queryFn: getServices,
    columns,
    urlKey: URL_KEY,
    initialFilters: INITIAL_FILTERS,
  });

  return (
    <DataTable.Root title="Services" state={tableState}>
      <DataTable.Toolbar>
        <DataTable.PageSize />
        <Divider orientation="vertical" visibleFrom="xs" />
        <ServiceStatusFilter
          value={tableState.filters.is_active}
          onChange={(is_active) => tableState.setFilters({ is_active })}
        />
        <DataTable.Search />
      </DataTable.Toolbar>
      <DataTable.Grid />
      <DataTable.Pagination />
    </DataTable.Root>
  );
}
