import { createListAdapter } from "@/components/ui/data-table";
import type { ServiceBreakdownRow } from "../types";
import type { SortPlan } from "@/components/ui/data-table";

/** A fetcher per service, the identifier being in the path rather than a
 * parameter. */
export const getServiceBreakdown = (serviceId: number) =>
  createListAdapter<ServiceBreakdownRow>(
    `/reports/services-sold/${serviceId}`,
    "transactions",
  );

/** `BACKEND_NOTES.md`: a third distinct allow-list. It allows
 * `series_number`, which `/reports/transactions` does not, and neither
 * amount sort, which that endpoint does. Default is `id` alone, which needs
 * no tiebreaker. */
export const SERVICE_BREAKDOWN_SORT_PLAN: SortPlan = {
  allowed: [
    "created_at",
    "id",
    "series_number",
    "customer_name",
    "total",
    "cashier_name",
  ],
  unique: ["id"],
  default: [{ key: "id", direction: "asc" }],
};
