import { useCallback, useEffect, useState } from "react";
import { useCombobox } from "@mantine/core";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { searchItemCodes } from "@/api/item-codes";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

/**
 * The combobox's text and its query, which are not the same thing.
 *
 * `typed` is null while the field is showing the current selection's name
 * rather than anything the user wrote. Only what they wrote reaches the
 * wire: sending the selection's own name back filters the list down to the
 * one option already chosen, which reads as "there is nothing else". See
 * #128.
 */
export function useItemCodeSearch(selectedName: string) {
  const [typed, setTyped] = useState<string | null>(null);

  const search = typed ?? selectedName;
  const trimmed = search.trim();
  const hasTyped = typed !== null;

  const debouncedQuery = useDebouncedValue(hasTyped ? trimmed : "", 300);

  const { data: itemCodes = [], isFetching } = useQuery({
    queryKey: ["item-codes", "search", debouncedQuery],
    queryFn: () => searchItemCodes(debouncedQuery),
    placeholderData: keepPreviousData,
  });

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const setSearch = useCallback((value: string) => setTyped(value), []);

  /** Back to showing the selection. Needed on submit as well as the effect
   * below, because picking the option that is already selected leaves
   * `selectedName` unchanged and would strand a half-typed query. */
  const showSelection = useCallback(() => setTyped(null), []);

  // The selection changed from outside — a different row's Edit button.
  // Whatever was half-typed belonged to the previous one.
  useEffect(() => {
    setTyped(null);
  }, [selectedName]);

  return {
    search,
    setSearch,
    showSelection,
    trimmed,
    hasTyped,
    itemCodes,
    isFetching,
    combobox,
  };
}
