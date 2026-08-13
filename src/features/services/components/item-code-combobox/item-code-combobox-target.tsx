import { Combobox, InputBase, Loader } from "@mantine/core";
import type { useCombobox } from "@mantine/core";

// Internal to this folder — not exported from index.ts. ItemCodeSelect and
// ItemCodeExistingSelect share this input wiring verbatim; everything that
// actually differs between them (dropdown contents, onOptionSubmit, value
// type) stays in each component, not here.
type ItemCodeComboboxTargetProps = {
  search: string;
  setSearch: (value: string) => void;
  combobox: ReturnType<typeof useCombobox>;
  isFetching: boolean;
  placeholder: string;
  error?: string;
};

export function ItemCodeComboboxTarget({
  search,
  setSearch,
  combobox,
  isFetching,
  placeholder,
  error,
}: ItemCodeComboboxTargetProps) {
  return (
    <Combobox.Target>
      <InputBase
        label="Item Code"
        placeholder={placeholder}
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
  );
}
