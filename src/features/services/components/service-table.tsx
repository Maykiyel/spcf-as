import { Divider } from "@mantine/core";
import { DataTable, useServerTableState } from "@/components/ui/data-table";
import { getServices, SERVICES_SORT_PLAN } from "../api/get-services";
import { serviceColumns } from "./service-columns";
import { ServiceFilterPanel } from "./service-filter-panel";
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
  // `["services"]` is a prefix, not the whole key — the hook appends the
  // page, size, search, sorts and filters. The filter is no longer named
  // here by hand, which is the point: it was in the request but not in the
  // key, so a stale page of the previous filter's rows could be served
  // with no error at all.
  const tableState = useServerTableState({
    queryKey: ["services"],
    queryFn: getServices,
    columns: serviceColumns({ onEdit }),
    urlKey: URL_KEY,
    sortPlan: SERVICES_SORT_PLAN,
    initialFilters: INITIAL_FILTERS,
  });

  return (
    <DataTable.Root title="Services" state={tableState}>
      <DataTable.Toolbar>
        <DataTable.PageSize />
        <Divider orientation="vertical" visibleFrom="xs" />
        <ServiceFilterPanel />
        <DataTable.Search />
      </DataTable.Toolbar>
      <DataTable.Grid />
      <DataTable.Pagination />
    </DataTable.Root>
  );
}
