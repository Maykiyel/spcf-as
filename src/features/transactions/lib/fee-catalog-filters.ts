import type { FeeCatalogItem, PriceRangeValue, SortByValue } from "../types";

export function isWithinPriceRange(
  price: number,
  range: PriceRangeValue,
): boolean {
  switch (range) {
    case "all":
      return true;
    case "under-300":
      return price < 300;
    case "300-1000":
      return price >= 300 && price <= 1000;
    case "over-1000":
      return price > 1000;
  }
}

type FeeCatalogFilters = {
  search: string;
  itemCodes: string[];
  priceRange: PriceRangeValue;
};

export function filterFeeCatalog(
  items: FeeCatalogItem[],
  { search, itemCodes, priceRange }: FeeCatalogFilters,
): FeeCatalogItem[] {
  const trimmedSearch = search.trim().toLowerCase();

  return items.filter((item) => {
    const matchesSearch =
      trimmedSearch === "" || item.name.toLowerCase().includes(trimmedSearch);
    const matchesItemCode =
      itemCodes.length === 0 || itemCodes.includes(item.itemCode);
    const matchesPriceRange = isWithinPriceRange(item.price, priceRange);

    return matchesSearch && matchesItemCode && matchesPriceRange;
  });
}

export function sortFeeCatalog(
  items: FeeCatalogItem[],
  sortBy: SortByValue,
): FeeCatalogItem[] {
  const sorted = [...items];

  switch (sortBy) {
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
  }
}

export function countByItemCode(
  items: FeeCatalogItem[],
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const item of items) {
    counts[item.itemCode] = (counts[item.itemCode] ?? 0) + 1;
  }

  return counts;
}
