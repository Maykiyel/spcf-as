import { useEffect } from "react";
import { CheckIcon, Combobox, Group, InputBase, Loader } from "@mantine/core";
import { useItemCodeSearch } from "./use-item-code-search";
import type { ExistingItemCodeSelection } from "./types";

type ItemCodeExistingSelectProps = {
  value: ExistingItemCodeSelection | null;
  onChange: (selection: ExistingItemCodeSelection) => void;
  error?: string;
};

export function ItemCodeExistingSelect({
  value,
  onChange,
  error,
}: ItemCodeExistingSelectProps) {
  const { search, setSearch, itemCodes, isFetching, combobox } =
    useItemCodeSearch(value?.name ?? "");

  useEffect(() => {
    setSearch(value?.name ?? "");
  }, [value?.name, setSearch]);

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(optionValue) => {
        const itemCode = itemCodes.find((ic) => String(ic.id) === optionValue);
        if (itemCode) {
          setSearch(itemCode.name);
          onChange({ kind: "existing", id: itemCode.id, name: itemCode.name });
        }
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          label="Item Code"
          placeholder="Search an existing item code"
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => combobox.closeDropdown()}
          rightSection={
            isFetching ? (
              <Loader size={16} />
            ) : (
              <Combobox.Chevron error={!!error} />
            )
          }
          rightSectionPointerEvents="none"
          error={error}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {itemCodes.length === 0 ? (
            <Combobox.Empty>
              {isFetching ? "Loading..." : "No item codes found"}
            </Combobox.Empty>
          ) : (
            itemCodes.map((ic) => (
              <Combobox.Option
                value={String(ic.id)}
                key={ic.id}
                selected={ic.id === value?.id}
              >
                <Group gap="sm" wrap="nowrap">
                  {ic.id === value?.id && <CheckIcon size={12} />}
                  <span>{ic.name}</span>
                </Group>
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
