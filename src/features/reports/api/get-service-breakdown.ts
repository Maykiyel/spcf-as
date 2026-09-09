import { createListAdapter } from "@/components/ui/data-table";
import type { ServiceBreakdownRow } from "../types";

/** A fetcher per service, the identifier being in the path rather than a
 * parameter. */
export const getServiceBreakdown = (serviceId: number) =>
  createListAdapter<ServiceBreakdownRow>(
    `/reports/services-sold/${serviceId}`,
    "transactions",
  );
