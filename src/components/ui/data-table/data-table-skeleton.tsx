import { Table, Skeleton } from "@mantine/core";
import type { ColumnDef } from "./types";

type DataTableSkeletonProps<T> = {
  columns: ColumnDef<T>[];
  rowCount: number;
};

export function DataTableSkeleton<T extends Record<string, any>>({
  columns,
  rowCount,
}: DataTableSkeletonProps<T>) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <Table.Tr key={`skeleton-row-${rowIndex}`}>
          {columns.map((col) => (
            <Table.Td key={col.id ?? col.key}>
              <Skeleton height={16} width="70%" radius="lg" />
            </Table.Td>
          ))}
        </Table.Tr>
      ))}
    </>
  );
}
