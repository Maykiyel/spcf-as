import { createListAdapter } from "@/components/ui/data-table";
import type { Service } from "@/api/services";
import type { SortPlan } from "@/components/ui/data-table";

/** One page of the services catalog. `supportsSearch`, because
 * `/services` is one of the three endpoints that accepts it. */
export const getServices = createListAdapter<Service>("/services", "services", {
  supportsSearch: true,
});

/** Not documented in `BACKEND_NOTES.md`: this transcribes the three keys
 * the catalog has always sorted under, which is evidence from a working UI
 * rather than a read of the allow-list. Check it against the backend before
 * adding a fourth. No `defaultSort` is declared here. */
export const SERVICES_SORT_PLAN: SortPlan = {
  allowed: ["item_code", "name", "price"],
};
