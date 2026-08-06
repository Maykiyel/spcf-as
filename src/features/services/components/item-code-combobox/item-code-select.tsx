import { useEffect } from "react";
import { Combobox, InputBase, Loader, Text } from "@mantine/core";
import { useItemCodeSearch } from "./use-item-code-search";
import type { ItemCodeSelection } from "./types";

type ItemCodeSelectProps = {
  value: ItemCodeSelection | null;
  onChange: (selection: ItemCodeSelection) => void;
  error?: string;
};

// Creatable item-code picker: search an existing item code, or create a new
// one inline. Used where the caller wants to select-or-add (e.g. the
// service form). Deliberately not built as reusable/shared infrastructure —
// the only real consumer today is Services; a future filter-style variant
// (e.g. for Transactions) should be designed against that page's actual
// requirements when it exists, not guessed at now.
export function ItemCodeSelect({ value, onChange, error }: ItemCodeSelectProps) {
  const { search, setSearch, trimmed, itemCodes, isFetching, combobox } =
    useItemCodeSearch(value?.name ?? "");

  useEffect(() => {
    setSearch(value?.name ?? "");
  }, [value?.name, setSearch]);

  const exactMatch = itemCodes.find(
    (ic) => ic.name.toLowerCase() === trimmed.toLowerCase(),
  );

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(optionValue) => {
        if (optionValue === "__create__") {
          onChange({ kind: "new", name: trimmed });
        } else {
          const itemCode = itemCodes.find(
            (ic) => String(ic.id) === optionValue,
          );
          if (itemCode) {
            setSearch(itemCode.name);
            onChange({
              kind: "existing",
              id: itemCode.id,
              name: itemCode.name,
            });
          }
        }
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          label="Item Code"
          placeholder="Search or create an item code"
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => combobox.closeDropdown()}
          rightSection={isFetching ? <Loader size={16} /> : null}
          error={error}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {itemCodes.length === 0 && !trimmed && (
            <Combobox.Empty>No item codes yet</Combobox.Empty>
          )}
          {itemCodes.map((ic) => (
            <Combobox.Option value={String(ic.id)} key={ic.id}>
              {ic.name}
            </Combobox.Option>
          ))}
          {trimmed && !exactMatch && (
            <Combobox.Option value="__create__">
              <Text c="primary" fw={600} size="sm">
                + Create new item code: "{trimmed}"
              </Text>
            </Combobox.Option>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
