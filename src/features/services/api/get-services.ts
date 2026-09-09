import { createListAdapter } from "@/components/ui/data-table";
import type { Service } from "@/api/services";
import type { SortPlan } from "@/components/ui/data-table";

/** One page of the services catalog. `supportsSearch`, because
 * `/services` is one of the three endpoints that accepts it. */
export const getServices = createListAdapter<Service>("/services", "services", {
  supportsSearch: true,
});

/** Read from `ServiceController::index` at backend `0428e2c`: `name`,
 * `price`, and `item_code` as an `AllowedSort::custom` over the parent's
 * name. No `defaultSort`. */
export const SERVICES_SORT_PLAN: SortPlan = {
  allowed: ["item_code", "name", "price"],
};
