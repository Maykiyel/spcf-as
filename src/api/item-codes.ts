import { apiClient } from "@/lib/axios/api-client";

export type ItemCode = {
  id: number;
  name: string;
  description: string | null;
};

type ItemCodesIndexData = {
  item_codes: ItemCode[];
  pagination: { total: number };
};

// Server-side search used by the item-code combobox variants. Caller is
// expected to debounce `search` before calling this. With no search term (browsing),
// returns a larger alphabetical page instead of the search page size —
// enough to browse without needing infinite scroll for a list this size.
export const searchItemCodes = async (search: string): Promise<ItemCode[]> => {
  const response = await apiClient.get<ItemCodesIndexData>("/item-codes", {
    params: {
      per_page: search ? 20 : 50,
      sort: "name",
      "filter[search]": search || undefined,
    },
  });
  return response.data.item_codes;
};
