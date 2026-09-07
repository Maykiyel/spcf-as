import { createListAdapter } from "@/components/ui/data-table";
import type { Service } from "@/api/services";

/** One page of the services catalog. `supportsSearch`, because
 * `/services` is one of the three endpoints that accepts it. */
export const getServices = createListAdapter<Service>("/services", "services", {
  supportsSearch: true,
});
