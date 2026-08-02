import { useState, useEffect } from "react";
import { Combobox, InputBase, useCombobox, Loader, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { getItemCodes } from "@/features/item-codes/api/get-item-codes";

export type ItemCodeSelection =
  | { kind: "existing"; id: number; name: string }
  | { kind: "new"; name: string };

type ItemCodeComboboxProps = {
  value: ItemCodeSelection | null;
  onChange: (selection: ItemCodeSelection) => void;
  error?: string;
  allowCreate?: boolean;
};

export function ItemCodeCombobox({
  value,
  onChange,
  error,
  allowCreate = true,
}: ItemCodeComboboxProps) {
  const { data: itemCodes = [], isLoading } = useQuery({
    queryKey: ["item-codes"],
    queryFn: getItemCodes,
  });

  const [search, setSearch] = useState(value?.name ?? "");

  useEffect(() => {
    setSearch(value?.name ?? "");
  }, [value?.name]);

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const trimmed = search.trim();
  const filtered = itemCodes.filter((ic) =>
    ic.name.toLowerCase().includes(trimmed.toLowerCase()),
  );
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
          placeholder={
            allowCreate
              ? "Search or create an item code"
              : "Search an existing item code"
          }
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => combobox.closeDropdown()}
          rightSection={isLoading ? <Loader size={16} /> : null}
          error={error}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {filtered.length === 0 && !trimmed && (
            <Combobox.Empty>No item codes yet</Combobox.Empty>
          )}
          {filtered.map((ic) => (
            <Combobox.Option value={String(ic.id)} key={ic.id}>
              {ic.name}
            </Combobox.Option>
          ))}
          {trimmed && !exactMatch && allowCreate && (
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
