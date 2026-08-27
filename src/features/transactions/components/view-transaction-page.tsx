import { Center, Group, Loader, Stack, Text } from "@mantine/core";
import { IconPrinter } from "@tabler/icons-react";
import { useNavigate, useParams } from "react-router";
import { Card } from "@/components/ui/card";
import { PrimaryButton } from "@/components/ui/button";
import { useTransactionDetail } from "../hooks/use-transaction-detail";
import { ReceiptItemsTable } from "./receipt-items-table";

export function ViewTransactionPage() {
  const { controlId } = useParams<{ controlId: string }>();
  const id = Number(controlId);
  const { transaction, isLoading, isForbidden, isError } =
    useTransactionDetail(id);
  const navigate = useNavigate();

  return (
    <Card.Root>
      <Card.Header title="View Transaction" />
      <Card.Divider />
      <Card.Body>
        {isLoading ? (
          <Center py="xl">
            <Group gap="xs">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">
                Loading transaction...
              </Text>
            </Group>
          </Center>
        ) : isForbidden ? (
          <Text ta="center" c="danger" py="xl">
            You don't have access to this transaction.
          </Text>
        ) : isError || !transaction ? (
          <Text ta="center" c="danger" py="xl">
            Couldn't load this transaction. Please try again.
          </Text>
        ) : (
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Group gap={4}>
                <Text size="sm" c="dimmed">
                  Customer Name:
                </Text>
                <Text size="sm" fw={700}>
                  {transaction.customer_name}
                </Text>
              </Group>
              <Stack gap={0} align="flex-end">
                <Text size="sm" c="dimmed">
                  Control ID: {transaction.control_id}
                </Text>
                <Text size="sm" c="dimmed">
                  Series No.: {transaction.series_number}
                </Text>
              </Stack>
            </Group>

            <ReceiptItemsTable
              items={transaction.items}
              total={transaction.total ?? 0}
              amountPaid={transaction.amount_paid}
              changeAmount={transaction.change_amount}
            />

            <Center>
              <PrimaryButton
                onClick={() =>
                  navigate(`/transactions/${transaction.control_id}/print`)
                }
                leftSection={<IconPrinter size={16} />}
              >
                Print
              </PrimaryButton>
            </Center>
          </Stack>
        )}
      </Card.Body>
    </Card.Root>
  );
}
