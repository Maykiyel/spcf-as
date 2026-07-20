import { Group, Text, Pagination } from "@mantine/core";
import { useDataTableContext } from "./data-table-context";

export function DataTablePagination() {
  const { page, pageSize, totalCount, onPageChange } = useDataTableContext();

  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <Group justify="space-between" wrap="wrap">
      <Text size="sm" c="dimmed">
        Showing {start} to {end} of {totalCount} entries
      </Text>
      <Pagination
        total={totalPages}
        value={page}
        onChange={onPageChange}
        size="sm"
      />
    </Group>
  );
}
