import { createListAdapter } from "@/components/ui/data-table";
import type { ServiceSoldRow } from "../types";
import type { SortPlan } from "@/components/ui/data-table";

/** One page of `GET /reports/services-sold`. No `supportsSearch`: an
 * unknown filter key here is a 400. */
export const getServicesSold = createListAdapter<ServiceSoldRow>(
  "/reports/services-sold",
  "services",
);

/** `BACKEND_NOTES.md`: sorts are `total_quantity`, `subtotal` and
 * `service_name`. No `defaultSort`, but backend `0428e2c` applies
 * `orderBy('service_id')` unconditionally after `allowedSorts()`, so pages
 * are stable under any sort and this client appends nothing. Alphabetical
 * is the declared default because there is no search box here, so finding a
 * service means scanning. */
export const SERVICES_SOLD_SORT_PLAN: SortPlan = {
  allowed: ["total_quantity", "subtotal", "service_name"],
  unique: ["service_name"],
  default: [{ key: "service_name", direction: "asc" }],
};
