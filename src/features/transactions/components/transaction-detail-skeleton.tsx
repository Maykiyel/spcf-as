import { Group, Skeleton, Stack, Table } from "@mantine/core";

/** Three is the middle of what this app produces, so the page neither
 * jumps taller nor collapses when the data lands. */
const PLACEHOLDER_ITEM_COUNT = 3;

/**
 * The View Transaction page's own shape, drawn in placeholders, since its
 * layout is known before its data is. Real table markup with the real
 * headers, matching `DataTableSkeleton`.
 *
 * Not shared with the Print page, the other consumer of
 * `TransactionDetailFallback`: that one renders two compact copies onto
 * 8.5 by 4 inch stock, so this layout would be a lie there.
 */
export function TransactionDetailSkeleton() {
  return (
    <Stack gap="md" aria-busy="true" data-testid="transaction-detail-skeleton">
      {/* Same header arrangement as the loaded page. */}
      <Group justify="space-between" align="flex-start">
        <Group gap="xs">
          <Skeleton height={16} width={180} radius="lg" />
          <Skeleton height={20} width={80} radius="xl" />
        </Group>
        <Stack gap={6} align="flex-end">
          <Skeleton height={14} width={120} radius="lg" />
          <Skeleton height={14} width={100} radius="lg" />
        </Stack>
      </Group>

      <Stack gap="xs">
        <Table withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Service</Table.Th>
              <Table.Th>Qty</Table.Th>
              <Table.Th>Price</Table.Th>
              <Table.Th>Subtotal</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {Array.from({ length: PLACEHOLDER_ITEM_COUNT }).map((_, row) => (
              <Table.Tr key={`skeleton-item-${row}`}>
                <Table.Td>
                  <Skeleton height={16} width="70%" radius="lg" />
                </Table.Td>
                <Table.Td>
                  <Skeleton height={16} width="40%" radius="lg" />
                </Table.Td>
                <Table.Td>
                  <Skeleton height={16} width="50%" radius="lg" />
                </Table.Td>
                <Table.Td>
                  <Skeleton height={16} width="50%" radius="lg" />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {/* Total, then amount paid and change, right-aligned. */}
        <Group justify="flex-end">
          <Skeleton height={16} width={140} radius="lg" />
        </Group>
        <Stack gap={4} align="flex-end">
          <Skeleton height={16} width={200} radius="lg" />
          <Skeleton height={16} width={160} radius="lg" />
        </Stack>
      </Stack>

      {/* The Print button's footprint, so no control appears under the
          reader's cursor when the data lands. */}
      <Group justify="center">
        <Skeleton height={36} width={120} radius="sm" />
      </Group>
    </Stack>
  );
}
