import type { ReactNode } from "react";
import { Group, Text, Select, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useDataTableContext } from "./data-table-context";

const PAGE_SIZE_OPTIONS = ["10", "25", "50", "100"];

type DataTableToolbarProps = {
  children: ReactNode;
};

/** A row of table controls, composed from the pieces a given table needs —
 * `DataTable.PageSize`, `DataTable.Search`, and whatever filter controls the
 * feature supplies. It renders its children and nothing else.
 *
 * `children` is required rather than optional on purpose. Most endpoints in
 * this API reject a `search` filter with a 400, so a toolbar that rendered a
 * search input by default would ship a control that fails the first time
 * someone types into it. Making the pieces explicit means that can't happen,
 * and it keeps a childless toolbar from meaning something a reader could only
 * discover by opening this file. */
export function DataTableToolbar({ children }: DataTableToolbarProps) {
  return (
    <Group gap="lg" wrap="wrap">
      {children}
    </Group>
  );
}

export function DataTablePageSize() {
  const { pageSize, onPageSizeChange } = useDataTableContext();

  return (
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
  );
}

/** Right-aligns itself with `ms="auto"` rather than the toolbar using
 * `justify="space-between"` — search stays at the far right however many
 * pieces precede it, whereas space-between would spread three pieces evenly
 * across the row. */
export function DataTableSearch() {
  const { searchQuery, onSearchChange } = useDataTableContext();

  return (
    <TextInput
      placeholder="Search"
      leftSection={<IconSearch size={16} />}
      value={searchQuery}
      onChange={(e) => onSearchChange(e.currentTarget.value)}
      w={{ base: "100%", xs: 250 }}
      ms="auto"
    />
  );
}
