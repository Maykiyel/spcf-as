import { Group, Text, Select, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useDataTableContext } from "./data-table-context";

const PAGE_SIZE_OPTIONS = ["10", "25", "50", "100"];

export function DataTableToolbar() {
  const { pageSize, onPageSizeChange, searchQuery, onSearchChange } =
    useDataTableContext();

  return (
    <Group justify="space-between" wrap="wrap">
      <Group gap="xs">
        <Text size="sm">Show</Text>
        <Select
          w={80}
          data={PAGE_SIZE_OPTIONS}
          value={String(pageSize)}
          onChange={(val) => val && onPageSizeChange(Number(val))}
          allowDeselect={false}
        />
        <Text size="sm">entries</Text>
      </Group>

      <TextInput
        placeholder="Search"
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(e) => onSearchChange(e.currentTarget.value)}
        w={{ base: "100%", xs: 250 }}
      />
    </Group>
  );
}
