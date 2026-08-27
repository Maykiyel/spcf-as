import { Group, Stack, Table, Text } from "@mantine/core";
import { formatCurrency } from "../lib/currency";
import type { TransactionItemDTO } from "../types";

type ReceiptItemsTableProps = {
  items: TransactionItemDTO[];
  total: number;
  amountPaid: number;
  changeAmount: number;
  // Print copies are physically 4in tall (see PrintAcknowledgementReceiptPage)
  // and need much tighter spacing than the View Transaction page, which is
  // a normal screen page with no such constraint — defaults to comfortable
  // (View page's needs) so this doesn't silently affect the screen page.
  compact?: boolean;
};

// Shared by ViewTransactionPage and AcknowledgementReceiptCopy — both
// render the exact same 4-column [Service, Qty, Price, Subtotal] shape
// plus totals. Extracted specifically because duplicating it would risk
// the two places' totals formatting silently drifting apart, the same
// class of risk the print page's two copies are already guarded against.
export function ReceiptItemsTable({
  items,
  total,
  amountPaid,
  changeAmount,
  compact = false,
}: ReceiptItemsTableProps) {
  const textSize = compact ? "xs" : "sm";

  return (
    <Stack gap={compact ? 4 : "xs"}>
      <Table
        withTableBorder
        withColumnBorders
        verticalSpacing={compact ? 2 : undefined}
        fz={textSize}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Service</Table.Th>
            <Table.Th>Qty</Table.Th>
            <Table.Th>Price</Table.Th>
            <Table.Th>Subtotal</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map((item) => (
            <Table.Tr key={item.id}>
              <Table.Td>{item.name}</Table.Td>
              <Table.Td>{item.quantity} pc(s)</Table.Td>
              <Table.Td>{formatCurrency(item.price)}</Table.Td>
              <Table.Td>{formatCurrency(item.subtotal)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Group justify="flex-end">
        <Text fw={700} size={textSize}>
          Total: {formatCurrency(total)}
        </Text>
      </Group>

      <Stack gap={compact ? 0 : 2} align="flex-end">
        <Text fw={700} size={textSize}>
          Total Amount Paid: {formatCurrency(amountPaid)}
        </Text>
        <Text fw={700} size={textSize}>
          Change: {formatCurrency(changeAmount)}
        </Text>
      </Stack>
    </Stack>
  );
}
