import { Divider, Group, Image, Stack, Text } from "@mantine/core";
import { schoolLogo, SCHOOL_ADDRESS, SCHOOL_NAME } from "../lib/school-info";
import { formatTransactionDate } from "../lib/transaction-date";
import { ReceiptItemsTable } from "./receipt-items-table";
import type { TransactionDTO } from "../types";

type AcknowledgementReceiptCopyProps = {
  transaction: TransactionDTO;
  copyLabel: string;
};

// Renders one full printed copy of an Acknowledgement Receipt. Used twice
// by PrintAcknowledgementReceiptPage (Accounting Office's / Student's),
// parameterized only by copyLabel — the two copies share this one
// template rather than being hand-duplicated markup, so they structurally
// cannot drift out of sync with each other. No Control ID here (already
// shown one click prior, on the View Transaction page).
//
// Kept deliberately compact throughout (small logo, plain bold text
// instead of a full Title, tight gaps) — the physical page is only 4
// inches tall (see PrintAcknowledgementReceiptPage), so screen-comfortable
// spacing here would overflow onto an unwanted extra page per copy.
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

      <ReceiptItemsTable
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
