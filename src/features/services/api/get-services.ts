import { createListAdapter } from "@/components/ui/data-table";
import type { Service } from "@/api/services";

/**
 * One page of the services catalog.
 *
 * The status filter used to arrive here as a second positional argument
 * and reach the wire through `createListAdapter`'s `extra`, which put the
 * value in the request but never in the query key — so `service-table.tsx`
 * had to remember to add it to the key by hand. Declaring the filter on
 * the table removed both, and left this the same bare adapter as
 * `getItemCodes` and `getSeriesReceipts`. Services was `extra`'s only
 * consumer in the app.
 *
 * `supportsSearch`, because `/services` is one of the three endpoints that
 * accepts `filter[search]`.
 */
export const getServices = createListAdapter<Service>("/services", "services", {
  supportsSearch: true,
});
