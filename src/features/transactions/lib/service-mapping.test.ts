import { describe, it, expect } from "vitest";
import { serviceToFeeCatalogItem, servicesToFeeCatalog } from "./service-mapping";
import type { Service } from "@/api/services";

const service: Service = {
  id: 1,
  name: "Graduation Fee - College",
  price: 1800,
  description: "College graduation fee.",
  is_active: true,
  item_code: { id: 5, name: "GRAD" },
};

describe("serviceToFeeCatalogItem", () => {
  it("maps a Service to a FeeCatalogItem, flattening item_code to its name", () => {
    expect(serviceToFeeCatalogItem(service)).toEqual({
      id: 1,
      name: "Graduation Fee - College",
      description: "College graduation fee.",
      price: 1800,
      itemCode: "GRAD",
    });
  });

  it("falls back to an empty item code when item_code is missing", () => {
    const { item_code: _itemCode, ...withoutItemCode } = service;
    expect(serviceToFeeCatalogItem(withoutItemCode as Service).itemCode).toBe(
      "",
    );
  });
});

describe("servicesToFeeCatalog", () => {
  it("maps a list of services", () => {
    expect(servicesToFeeCatalog([service])).toEqual([
      {
        id: 1,
        name: "Graduation Fee - College",
        description: "College graduation fee.",
        price: 1800,
        itemCode: "GRAD",
      },
    ]);
  });

  it("returns an empty array for an empty list", () => {
    expect(servicesToFeeCatalog([])).toEqual([]);
  });
});
