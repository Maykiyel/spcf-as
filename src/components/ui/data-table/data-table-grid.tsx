import { Table, UnstyledButton, Group, Text } from "@mantine/core";
import { IconCaretUpFilled, IconCaretDownFilled } from "@tabler/icons-react";
import { useDataTableContext } from "./data-table-context";

export function DataTableGrid<T extends Record<string, any>>() {
  const { columns, rows, sortKey, sortDirection, onSort, isLoading } =
    useDataTableContext<T>();

  return (
    <Table.ScrollContainer minWidth={600}>
      <Table
        verticalSpacing="sm"
        highlightOnHover
        withColumnBorders
        withTableBorder
      >
        <Table.Thead>
          <Table.Tr>
            {columns.map((col) => (
              <Table.Th key={col.id ?? col.key}>
                {col.sortable ? (
                  <UnstyledButton onClick={() => onSort(col.key)}>
                    <Group gap={4} wrap="nowrap">
                      <Text fw={600} size="sm">
                        {col.header}
                      </Text>
                      <Group gap={0}>
                        <IconCaretUpFilled
                          size={12}
                          opacity={
                            sortKey === col.key && sortDirection === "asc"
                              ? 1
                              : 0.3
                          }
                        />
                        <IconCaretDownFilled
                          size={12}
                          opacity={
                            sortKey === col.key && sortDirection === "desc"
                              ? 1
                              : 0.3
                          }
                        />
                      </Group>
                    </Group>
                  </UnstyledButton>
                ) : (
                  <Text fw={600} size="sm">
                    {col.header}
                  </Text>
                )}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {!isLoading && rows.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={columns.length}>
                <Text ta="center" c="dimmed" py="lg">
                  No entries found
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
          {rows.map((row, i) => (
            <Table.Tr key={row.id ?? i}>
              {columns.map((col) => (
                <Table.Td key={col.id ?? col.key}>
                  {col.render ? col.render(row) : String(row[col.key] ?? "")}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
