import { createListAdapter } from "@/components/ui/data-table";
import type { Service } from "@/api/services";
import type { SortPlan } from "@/components/ui/data-table";

/** One page of the services catalog. `supportsSearch`, because
 * `/services` is one of the three endpoints that accepts it. */
export const getServices = createListAdapter<Service>("/services", "services", {
  supportsSearch: true,
});

/** Read from `ServiceController::index` at backend `bfe249f`: `name`,
 * `price`, and `item_code` as an `AllowedSort::custom` over the parent's
 * name. Default `name`, with `orderBy('id')` behind it since backend
 * `7fb5fc1`, so paging is stable without this plan declaring anything. */
export const SERVICES_SORT_PLAN: SortPlan = {
  allowed: ["item_code", "name", "price"],
};
