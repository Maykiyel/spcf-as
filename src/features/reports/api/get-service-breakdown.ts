import { createListAdapter } from "@/components/ui/data-table";
import type { ServiceBreakdownRow } from "../types";

/** A fetcher per service, because the identifier is in the path rather than
 * a parameter. Its sort allow-list is a third distinct one: `series_number`
 * is allowed here and not on `/reports/transactions`. */
export const getServiceBreakdown = (serviceId: number) =>
  createListAdapter<ServiceBreakdownRow>(
    `/reports/services-sold/${serviceId}`,
    "transactions",
  );
