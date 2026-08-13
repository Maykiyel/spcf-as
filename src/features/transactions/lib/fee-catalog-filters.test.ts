import { describe, it, expect } from "vitest";
import {
  isWithinPriceRange,
  filterFeeCatalog,
  sortFeeCatalog,
  countByItemCode,
} from "./fee-catalog-filters";
import type { FeeCatalogItem } from "../types";

const items: FeeCatalogItem[] = [
  {
    id: 1,
    name: "Graduation Fee - College",
    description: "Lorem ipsum",
    price: 1500,
    itemCode: "GRAD",
  },
  {
    id: 2,
    name: "TOIEC Exam Fee",
    description: "Lorem ipsum",
    price: 450,
    itemCode: "TOIEC",
  },
  {
    id: 3,
    name: "Parking Sticker",
    description: "Lorem ipsum",
    price: 200,
    itemCode: "PARKING",
  },
  {
    id: 4,
    name: "Alumni Association Fee",
    description: "Lorem ipsum",
    price: 300,
    itemCode: "ALUMNI",
  },
];

describe("isWithinPriceRange", () => {
  it("'all' matches every price", () => {
    expect(isWithinPriceRange(0, "all")).toBe(true);
    expect(isWithinPriceRange(999999, "all")).toBe(true);
  });

  it("'under-300' matches prices strictly below 300", () => {
    expect(isWithinPriceRange(299.99, "under-300")).toBe(true);
    expect(isWithinPriceRange(300, "under-300")).toBe(false);
  });

  it("'300-1000' is inclusive on both ends", () => {
    expect(isWithinPriceRange(300, "300-1000")).toBe(true);
    expect(isWithinPriceRange(1000, "300-1000")).toBe(true);
    expect(isWithinPriceRange(299.99, "300-1000")).toBe(false);
    expect(isWithinPriceRange(1000.01, "300-1000")).toBe(false);
  });

  it("'over-1000' matches prices strictly above 1000", () => {
    expect(isWithinPriceRange(1000, "over-1000")).toBe(false);
    expect(isWithinPriceRange(1000.01, "over-1000")).toBe(true);
  });
});

describe("filterFeeCatalog", () => {
  it("returns everything when there's no search, item codes, or price range", () => {
    const result = filterFeeCatalog(items, {
      search: "",
      itemCodes: [],
      priceRange: "all",
    });
    expect(result).toHaveLength(4);
  });

  it("matches search case-insensitively against the name", () => {
    const result = filterFeeCatalog(items, {
      search: "toiec",
      itemCodes: [],
      priceRange: "all",
    });
    expect(result.map((i) => i.id)).toEqual([2]);
  });

  it("keeps only items whose item code is selected", () => {
    const result = filterFeeCatalog(items, {
      search: "",
      itemCodes: ["GRAD", "PARKING"],
      priceRange: "all",
    });
    expect(result.map((i) => i.id).sort()).toEqual([1, 3]);
  });

  it("applies the price range on top of item code and search", () => {
    const result = filterFeeCatalog(items, {
      search: "",
      itemCodes: [],
      priceRange: "under-300",
    });
    expect(result.map((i) => i.id)).toEqual([3]);
  });
});

describe("sortFeeCatalog", () => {
  it("sorts by name ascending", () => {
    const result = sortFeeCatalog(items, "name-asc");
    expect(result.map((i) => i.name)).toEqual([
      "Alumni Association Fee",
      "Graduation Fee - College",
      "Parking Sticker",
      "TOIEC Exam Fee",
    ]);
  });

  it("sorts by name descending", () => {
    const result = sortFeeCatalog(items, "name-desc");
    expect(result.map((i) => i.name)).toEqual([
      "TOIEC Exam Fee",
      "Parking Sticker",
      "Graduation Fee - College",
      "Alumni Association Fee",
    ]);
  });

  it("sorts by price ascending", () => {
    const result = sortFeeCatalog(items, "price-asc");
    expect(result.map((i) => i.price)).toEqual([200, 300, 450, 1500]);
  });

  it("sorts by price descending", () => {
    const result = sortFeeCatalog(items, "price-desc");
    expect(result.map((i) => i.price)).toEqual([1500, 450, 300, 200]);
  });

  it("does not mutate the input array", () => {
    const copy = [...items];
    sortFeeCatalog(items, "price-desc");
    expect(items).toEqual(copy);
  });
});

describe("countByItemCode", () => {
  it("counts how many items exist per item code", () => {
    expect(countByItemCode(items)).toEqual({
      GRAD: 1,
      TOIEC: 1,
      PARKING: 1,
      ALUMNI: 1,
    });
  });
});
