import { useMemo } from "react";
import { Anchor, Divider, Group, Stack } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  DataTable,
  useServerTableState,
  dateRangeFiltersRequired,
  type TableFilters,
} from "@/components/ui/data-table";
import { DateRangeTableFilter } from "@/components/filters";
import { getServiceBreakdown } from "../api/get-service-breakdown";
import { getService } from "../api/get-service";
import {
  SERVICE_BREAKDOWN_QUERY_KEY,
  serviceDetailQueryKey,
} from "../api/reports-query-keys";
import {
  SERVICE_BREAKDOWN_URL_KEY,
  servicesSoldPath,
} from "../lib/services-sold-routes";
import { useReportPeriod } from "../lib/use-report-period";
import {
  serviceBreakdownColumns,
  SERVICE_BREAKDOWN_DEFAULT_SORTS,
} from "./service-breakdown-columns";

/**
 * The transactions behind one service's figure.
 *
 * A route rather than a drawer, so a service and a period together are a
 * link. An id naming no service 404s into the table's own error state.
 */
export function ServiceBreakdownPage() {
  const serviceId = Number(useParams().serviceId);
  const { defaults, current } = useReportPeriod(SERVICE_BREAKDOWN_URL_KEY);

  // Named per service, since the identifier is in the path.
  const queryFn = useMemo(() => getServiceBreakdown(serviceId), [serviceId]);

  const initialFilters: TableFilters = {
    from_date: defaults.from,
    to_date: defaults.to,
  };

  const tableState = useServerTableState({
    queryKey: [...SERVICE_BREAKDOWN_QUERY_KEY, serviceId],
    queryFn,
    columns: serviceBreakdownColumns,
    urlKey: SERVICE_BREAKDOWN_URL_KEY,
    initialSorts: SERVICE_BREAKDOWN_DEFAULT_SORTS,
    initialFilters,
    // Both dates are `required` here, so an absent range is a 422 rather
    // than an unfiltered request.
    filtersUsable: dateRangeFiltersRequired,
  });

  // The heading's only source: the route carries an id and the rows carry
  // no service at all. A failure leaves the plain title rather than
  // blanking a table that loaded.
  const { data: service } = useQuery({
    queryKey: serviceDetailQueryKey(serviceId),
    queryFn: () => getService(serviceId),
  });

  const title = service
    ? `Service Breakdown: ${service.name}`
    : "Service Breakdown";

  return (
    <Stack gap="md">
      <Group>
        <Anchor component={Link} to={servicesSoldPath(current)}>
          <Group gap={4} wrap="nowrap">
            <IconArrowLeft size={16} />
            Back to Services Sold
          </Group>
        </Anchor>
      </Group>

      <DataTable.Root title={title} state={tableState}>
        <DateRangeTableFilter
          filters={tableState.filters}
          onChange={tableState.setFilters}
        />
        <Divider />
        <DataTable.Toolbar>
          <DataTable.PageSize />
        </DataTable.Toolbar>
        <DataTable.Grid />
        <DataTable.Pagination />
      </DataTable.Root>
    </Stack>
  );
}
