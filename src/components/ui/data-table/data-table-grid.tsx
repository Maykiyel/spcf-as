import { Table, UnstyledButton, Group, Text } from "@mantine/core";
import { IconCaretUpFilled, IconCaretDownFilled } from "@tabler/icons-react";
import { useDataTableContext } from "./data-table-context";
import { DataTableSkeleton } from "./data-table-skeleton";

const MAX_SKELETON_ROWS = 10;

/** A click on a control inside a row belongs to that control, not the row.
 * Without it, the Void button would also navigate away. */
const INTERACTIVE_WITHIN_ROW = "a,button,input,select,textarea";

type DataTableGridProps<T> = {
  /** What clicking a row does. Omitted by default: no handler, no pointer
   * cursor. A prop rather than shared state, which knows nothing about
   * navigation. */
  onRowClick?: (row: T) => void;
};

export function DataTableGrid<T extends Record<string, any>>({
  onRowClick,
}: DataTableGridProps<T> = {}) {
  const {
    columns,
    rows,
    sorts,
    onSort,
    isLoading,
    isError,
    errorMessage,
    pageSize,
  } = useDataTableContext<T>();

  const isInitialLoading = isLoading && rows.length === 0 && !isError;
  const isInitialError = isError && rows.length === 0;
  const isBackgroundRefetch = isLoading && rows.length > 0;

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
            {columns.map((col) => {
              if (!col.sortable) {
                return (
                  <Table.Th key={col.id ?? col.key}>
                    <Text fw={600} size="sm">
                      {col.header}
                    </Text>
                  </Table.Th>
                );
              }

              // The endpoint's name for the column, not always the field
              // the cell reads. See `sortKey`.
              const sortKey = col.sortKey ?? col.key;
              const sortIndex = sorts.findIndex((s) => s.key === sortKey);
              const active = sortIndex !== -1;
              const direction = active ? sorts[sortIndex].direction : null;
              const showPriorityBadge = active && sorts.length > 1;

              return (
                // Carets are drawn with opacity, so the sorted state is
                // invisible to a screen reader and a test. This is both.
                <Table.Th
                  key={col.id ?? col.key}
                  aria-sort={
                    active
                      ? direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <UnstyledButton onClick={() => onSort(sortKey)}>
                    <Group gap={4} wrap="nowrap">
                      <Text fw={600} size="sm">
                        {col.header}
                      </Text>
                      {showPriorityBadge && (
                        <Text fw={700} size="xs" c="primary">
                          {sortIndex + 1}
                        </Text>
                      )}
                      <Group gap={0}>
                        <IconCaretUpFilled
                          size={12}
                          opacity={direction === "asc" ? 1 : 0.3}
                        />
                        <IconCaretDownFilled
                          size={12}
                          opacity={direction === "desc" ? 1 : 0.3}
                        />
                      </Group>
                    </Group>
                  </UnstyledButton>
                </Table.Th>
              );
            })}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody
          style={{
            opacity: isBackgroundRefetch ? 0.6 : 1,
            transition: "opacity 150ms ease",
          }}
        >
          {isInitialLoading ? (
            <DataTableSkeleton
              columns={columns}
              rowCount={Math.min(pageSize, MAX_SKELETON_ROWS)}
            />
          ) : isInitialError ? (
            <Table.Tr>
              <Table.Td colSpan={columns.length}>
                <Text ta="center" c="danger" py="lg">
                  {errorMessage ?? "Something went wrong."}
                </Text>
              </Table.Td>
            </Table.Tr>
          ) : rows.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={columns.length}>
                <Text ta="center" c="dimmed" py="lg">
                  No entries found
                </Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            rows.map((row, i) => (
              <Table.Tr
                key={row.id ?? i}
                onClick={
                  onRowClick
                    ? (event) => {
                        if (
                          (event.target as HTMLElement).closest(
                            INTERACTIVE_WITHIN_ROW,
                          )
                        ) {
                          return;
                        }
                        onRowClick(row);
                      }
                    : undefined
                }
                style={onRowClick ? { cursor: "pointer" } : undefined}
              >
                {columns.map((col) => (
                  <Table.Td key={col.id ?? col.key}>
                    {col.render ? col.render(row) : String(row[col.key] ?? "")}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
