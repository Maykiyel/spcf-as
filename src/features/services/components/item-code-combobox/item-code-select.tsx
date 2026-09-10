import { Combobox, Text } from "@mantine/core";
import { useItemCodeSearch } from "./use-item-code-search";
import { ItemCodeComboboxTarget } from "./item-code-combobox-target";
import type { ItemCodeSelection } from "./types";

type ItemCodeSelectProps = {
  value: ItemCodeSelection | null;
  onChange: (selection: ItemCodeSelection) => void;
  error?: string;
};

export function ItemCodeSelect({
  value,
  onChange,
  error,
}: ItemCodeSelectProps) {
  const {
    search,
    setSearch,
    showSelection,
    trimmed,
    hasTyped,
    itemCodes,
    isFetching,
    combobox,
  } = useItemCodeSearch(value?.name ?? "");

  const exactMatch = itemCodes.find(
    (ic) => ic.name.toLowerCase() === trimmed.toLowerCase(),
  );

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(optionValue) => {
        if (optionValue === "__create__") {
          showSelection();
          onChange({ kind: "new", name: trimmed });
        } else {
          const itemCode = itemCodes.find(
            (ic) => String(ic.id) === optionValue,
          );
          if (itemCode) {
            showSelection();
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
      <ItemCodeComboboxTarget
        search={search}
        setSearch={setSearch}
        combobox={combobox}
        isFetching={isFetching}
        placeholder="Search or create an item code"
        error={error}
      />

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
          {/* Only once they have actually typed. Showing a selection's own
              name is not a request to create one, and the list behind
              `exactMatch` is the unfiltered page, which need not contain it. */}
          {hasTyped && trimmed && !exactMatch && (
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
