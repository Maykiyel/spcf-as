import { Divider, Group, Image, Stack, Text } from "@mantine/core";
import { schoolLogo, SCHOOL_ADDRESS, SCHOOL_NAME } from "../lib/school-info";
import { formatTransactionDate } from "../lib/transaction-date";
import { TransactionItemsTable } from "./transaction-items-table";
import type { TransactionDTO } from "../types";

type AcknowledgementReceiptCopyProps = {
  transaction: TransactionDTO;
  copyLabel: string;
};

// One printed copy of an Acknowledgement Receipt, rendered twice and
// parameterised only by `copyLabel`, so the two copies cannot drift apart.
// No Control ID: it was shown one click prior.
//
// Compact throughout on purpose. The physical page is 4 inches tall, so
// screen-comfortable spacing overflows onto an extra page per copy.
export function AcknowledgementReceiptCopy({
  transaction,
  copyLabel,
}: AcknowledgementReceiptCopyProps) {
  return (
    <Stack gap={4}>
      <Group justify="center" gap="xs">
        <Image src={schoolLogo} w={32} h={32} />
        <Stack gap={0} align="center">
          <Text fw={700} size="sm">
            {SCHOOL_NAME}
          </Text>
          <Text size="xs" c="dimmed">
            {SCHOOL_ADDRESS}
          </Text>
        </Stack>
      </Group>

      <Text fw={700} size="sm" c="danger">
        ACKNOWLEDGEMENT RECEIPT: {transaction.series_number ?? "—"}
      </Text>

      <Group justify="space-between">
        <Group gap={4}>
          <Text size="xs" fw={700}>
            CUSTOMER NAME:
          </Text>
          <Text size="xs" fw={700}>
            {transaction.customer_name ?? "—"}
          </Text>
        </Group>
        <Text size="xs">
          Date: {formatTransactionDate(transaction.date)}
        </Text>
      </Group>

      <TransactionItemsTable
        items={transaction.items}
        total={transaction.total ?? 0}
        amountPaid={transaction.amount_paid}
        changeAmount={transaction.change_amount}
        compact
      />

      <Divider my={4} />

      <Group justify="space-between">
        <Text size="xs">{copyLabel}</Text>
        <Text size="xs">CASHIER: {transaction.cashier?.full_name ?? "—"}</Text>
      </Group>
    </Stack>
  );
}
