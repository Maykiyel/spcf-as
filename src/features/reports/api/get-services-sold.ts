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
 * `service_name`, and the endpoint's own default is `service_name` too as
 * of backend `bfe249f`. `orderBy('transaction_items.service_id')` applies
 * unconditionally after `allowedSorts()`, so pages are stable under any
 * sort and this client appends nothing. Alphabetical is declared here as
 * well because there is no search box, so finding a service means
 * scanning, and a declared default is what lights the header's caret. */
export const SERVICES_SOLD_SORT_PLAN: SortPlan = {
  allowed: ["total_quantity", "subtotal", "service_name"],
  unique: ["service_name"],
  default: [{ key: "service_name", direction: "asc" }],
};
