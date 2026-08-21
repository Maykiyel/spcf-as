import { getActiveServices } from "./get-active-services";
import { servicesToFeeCatalog } from "../lib/service-mapping";
import type { FeeCatalogItem } from "../types";

// The Fee Catalog panel filters/sorts client-side (search, item-code
// chips, price range, sort order — see `lib/fee-catalog-filters.ts`), so
// it needs the full active catalog up front rather than a paginated or
// server-searched list.
export const getFeeCatalog = async (): Promise<FeeCatalogItem[]> => {
  const services = await getActiveServices();
  return servicesToFeeCatalog(services);
};
