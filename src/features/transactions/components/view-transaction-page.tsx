import { Badge, Group, Stack, Text } from "@mantine/core";
import { IconPrinter } from "@tabler/icons-react";
import { useNavigate, useParams } from "react-router";
import { Card } from "@/components/ui/card";
import { PrimaryButton } from "@/components/ui/button";
import { useTransactionDetail } from "../hooks/use-transaction-detail";
import {
  isPrintable,
  NO_VALUE_PLACEHOLDER,
  printRefusalReason,
  TRANSACTION_STATUS_LABEL,
} from "../lib/transaction-status";
import { TransactionItemsTable } from "./transaction-items-table";
import { TransactionDetailFallback } from "./transaction-detail-fallback";

// Green only for the one status that means the payment stands. `returned`
// is the outcome of an admin voiding a completed transaction, so it is the
// one a cashier most needs to notice.
const STATUS_COLOR: Record<string, string> = {
  completed: "success",
  returned: "danger",
};
const DEFAULT_STATUS_COLOR = "tertiary";

export function ViewTransactionPage() {
  const { controlId } = useParams<{ controlId: string }>();
  const id = Number(controlId);
  const detail = useTransactionDetail(id);
  const { transaction, isUnavailable } = detail;
  const navigate = useNavigate();

  return (
    <Card.Root>
      <Card.Header title="View Transaction" />
      <Card.Divider />
      <Card.Body>
        {isUnavailable || !transaction ? (
          <TransactionDetailFallback detail={detail} />
        ) : (
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Group gap={4}>
                <Text size="sm" c="dimmed">
                  Customer Name:
                </Text>
                <Text size="sm" fw={700}>
                  {transaction.customer_name ?? NO_VALUE_PLACEHOLDER}
                </Text>
                <Badge
                  color={
                    STATUS_COLOR[transaction.status] ?? DEFAULT_STATUS_COLOR
                  }
                  variant="light"
                  ml="xs"
                >
                  {TRANSACTION_STATUS_LABEL[transaction.status]}
                </Badge>
              </Group>
              <Stack gap={0} align="flex-end">
                <Text size="sm" c="dimmed">
                  Control ID: {transaction.control_id}
                </Text>
                <Text size="sm" c="dimmed">
                  Series No.:{" "}
                  {transaction.series_number ?? NO_VALUE_PLACEHOLDER}
                </Text>
              </Stack>
            </Group>

            <TransactionItemsTable
              items={transaction.items}
              total={transaction.total}
              amountPaid={transaction.amount_paid}
              changeAmount={transaction.change_amount}
            />

            {/* The button stays, disabled, rather than disappearing.
                Someone who prints these all day reads a missing Print
                button as the page having failed to load; the badge above
                and the reason below answer the question before it is
                asked. */}
            <Stack gap={4} align="center">
              <PrimaryButton
                onClick={() =>
                  navigate(`/transactions/${transaction.control_id}/print`)
                }
                leftSection={<IconPrinter size={16} />}
                disabled={!isPrintable(transaction.status)}
              >
                Print
              </PrimaryButton>
              {!isPrintable(transaction.status) && (
                <Text size="xs" c="dimmed" ta="center">
                  {printRefusalReason(transaction.status)}
                </Text>
              )}
            </Stack>
          </Stack>
        )}
      </Card.Body>
    </Card.Root>
  );
}
