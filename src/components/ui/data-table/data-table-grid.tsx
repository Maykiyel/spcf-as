import { Table, UnstyledButton, Group, Text } from "@mantine/core";
import { IconCaretUpFilled, IconCaretDownFilled } from "@tabler/icons-react";
import { useDataTableContext } from "./data-table-context";
import { DataTableSkeleton } from "./data-table-skeleton";

const MAX_SKELETON_ROWS = 10;

/** A click that landed on a control inside a row is that control's, not
 * the row's. The receipts list puts a link on the Control ID cell and the
 * Void page puts a button on every row, so without this a Void click would
 * also navigate away from the page it was meant to act on. */
const INTERACTIVE_WITHIN_ROW = "a,button,input,select,textarea";

type DataTableGridProps<T> = {
  /** What clicking a row does. Omitted by default, and a table that omits
   * it renders exactly as it did before this existed — no pointer cursor,
   * no handler.
   *
   * This is a prop rather than part of the shared state because the state
   * comes from `useClientTableState`/`useServerTableState`, and neither
   * knows anything about navigation. */
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

              // The name the endpoint knows this column by, which is not
              // always the field the cell reads — see `sortKey`.
              const sortKey = col.sortKey ?? col.key;
              const sortIndex = sorts.findIndex((s) => s.key === sortKey);
              const active = sortIndex !== -1;
              const direction = active ? sorts[sortIndex].direction : null;
              const showPriorityBadge = active && sorts.length > 1;

              return (
                // The carets are drawn with opacity, so the sorted state
                // is invisible to a screen reader and to a test. This is
                // the handle for both.
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
