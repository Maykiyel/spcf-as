import { Group, Skeleton, Stack, Table } from "@mantine/core";

/** How many placeholder rows the items table shows.
 *
 * Three, because a transaction's real item count is unknowable before the
 * response and this is the middle of what the app actually produces: the
 * fee catalog is built around a handful of fees per payer. Too few and the
 * page jumps taller when the data lands; too many and it collapses. */
const PLACEHOLDER_ITEM_COUNT = 3;

/** The View Transaction page's own shape, drawn in placeholders.
 *
 * A skeleton rather than a spinner because this page's layout is known
 * before its data is: the header, the four-column items table and the
 * totals are there whatever the transaction turns out to be. A spinner
 * says "something is coming"; this says what.
 *
 * It earns its keep more since #62, because voiding now *removes* the
 * transaction's cached detail rather than marking it stale, so an admin
 * who voids a transaction and opens it meets this rather than a cached
 * page. That path is the reason it exists.
 *
 * **Deliberately not shared with the Print page**, which is the other
 * consumer of `TransactionDetailFallback`. That page renders two compact
 * receipt copies onto 8.5 by 4 inch stock, so this layout would be a lie
 * there; it keeps the spinner. What the two pages must not word
 * differently is the 403 and the failure, and those stay shared and
 * unchanged.
 *
 * The table is real markup with the real four headers rather than plain
 * bars, matching `DataTableSkeleton`'s approach in the shared tier: the
 * columns are fixed, so showing them costs nothing and makes the wait look
 * like the page instead of like a different screen.
 */
export function TransactionDetailSkeleton() {
  return (
    <Stack gap="md" aria-busy="true" data-testid="transaction-detail-skeleton">
      {/* Header: payer and status on the left, control ID and series
          number stacked on the right, same as the loaded page. */}
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

        {/* Total, then amount paid and change, right-aligned as they are
            on the loaded page. */}
        <Group justify="flex-end">
          <Skeleton height={16} width={140} radius="lg" />
        </Group>
        <Stack gap={4} align="flex-end">
          <Skeleton height={16} width={200} radius="lg" />
          <Skeleton height={16} width={160} radius="lg" />
        </Stack>
      </Stack>

      {/* The Print button's footprint, so the page doesn't grow a control
          underneath the reader's cursor when the data lands. */}
      <Group justify="center">
        <Skeleton height={36} width={120} radius="sm" />
      </Group>
    </Stack>
  );
}
