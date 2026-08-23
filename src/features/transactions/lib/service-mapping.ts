import type { Service } from "@/api/services";
import type { FeeCatalogItem } from "../types";

// Every Service is created with an item code (required at creation time —
// see StoreServiceRequest), so `item_code` should always be present once
// loaded. Falling back to an empty string rather than throwing keeps a
// single unexpected record from breaking the whole catalog panel; it'll
// just show up uncategorized instead of being filterable by item code.
export function serviceToFeeCatalogItem(service: Service): FeeCatalogItem {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    price: service.price,
    itemCode: service.item_code?.name ?? "",
  };
}

export function servicesToFeeCatalog(services: Service[]): FeeCatalogItem[] {
  return services.map(serviceToFeeCatalogItem);
}
