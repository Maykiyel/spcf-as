import { useState } from "react";
import { useCombobox } from "@mantine/core";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { searchItemCodes } from "@/api/item-codes";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

export function useItemCodeSearch(initialSearch: string) {
  const [search, setSearch] = useState(initialSearch);
  const trimmed = search.trim();
  const debouncedSearch = useDebouncedValue(trimmed, 300);

  const { data: itemCodes = [], isFetching } = useQuery({
    queryKey: ["item-codes", "search", debouncedSearch],
    queryFn: () => searchItemCodes(debouncedSearch),
    placeholderData: keepPreviousData,
  });

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  return { search, setSearch, trimmed, itemCodes, isFetching, combobox };
}
