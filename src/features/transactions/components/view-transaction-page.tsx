import { Box, Group, Stack, Text } from "@mantine/core";
import { IconPrinter } from "@tabler/icons-react";
import { useNavigate, useParams } from "react-router";
import { Card } from "@/components/ui/card";
import { PrimaryButton } from "@/components/ui/button";
import { useTransactionDetail } from "../hooks/use-transaction-detail";
import { formatTransactionDate } from "../lib/transaction-date";
import { isPrintable, printRefusalReason } from "../lib/transaction-status";
import { TransactionItemsTable } from "./transaction-items-table";
import { TransactionStatusBadge } from "./transaction-status-badge";
import { TransactionDetailFallback } from "./transaction-detail-fallback";

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
                  {transaction.customer_name ?? "—"}
                </Text>
                <Box ml="xs">
                  <TransactionStatusBadge status={transaction.status} />
                </Box>
              </Group>
              <Stack gap={0} align="flex-end">
                <Text size="sm" c="dimmed">
                  Control ID: {transaction.control_id}
                </Text>
                <Text size="sm" c="dimmed">
                  Series No.: {transaction.series_number ?? "—"}
                </Text>
              </Stack>
            </Group>

            {/* Only a voided transaction has either field, and this page
                is the only place in the app that can show who did it:
                `show` eager-loads `voidedBy` once the status is
                `returned`, and no list endpoint loads it at all.

                Gated on the timestamp rather than on the status, because
                the timestamp is the field actually being rendered. The
                name falls back because the two arrive by different routes
                — one a column, one a relation — and a missing eager load
                should read as an unknown admin, not as a missing line. */}
            {transaction.voided_at && (
              <Text size="sm" c="dimmed">
                Voided on {formatTransactionDate(transaction.voided_at)} by{" "}
                {transaction.voided_by?.full_name ?? "an unknown admin"}
              </Text>
            )}

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
