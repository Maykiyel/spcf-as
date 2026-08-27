import { Center, Group, Loader, Text } from "@mantine/core";
import type { useTransactionDetail } from "../hooks/use-transaction-detail";

type TransactionDetailFallbackProps = {
  // The hook's whole result, not three separate booleans: the states are
  // mutually exclusive and always travel together, so splitting them into
  // props would just be a clump waiting to be passed inconsistently.
  detail: ReturnType<typeof useTransactionDetail>;
};

// The loading / no-access / failed states shared by the View Transaction
// and Print Acknowledgement Receipt pages. useTransactionDetail already
// exists so the two pages classify a 403 identically — this is the other
// half of that: without it the two pages would still be free to *word*
// the same classification differently, which is the drift the hook was
// extracted to prevent.
//
// Returns null once there's a transaction to show, so callers can render
// it alongside their real content rather than branching twice.
export function TransactionDetailFallback({
  detail,
}: TransactionDetailFallbackProps) {
  const { transaction, isLoading, isForbidden, isError } = detail;

  if (isLoading) {
    return (
      <Center py="xl">
        <Group gap="xs">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            Loading transaction...
          </Text>
        </Group>
      </Center>
    );
  }

  if (isForbidden) {
    return (
      <Text ta="center" c="danger" py="xl">
        You don't have access to this transaction.
      </Text>
    );
  }

  if (isError || !transaction) {
    return (
      <Text ta="center" c="danger" py="xl">
        Couldn't load this transaction. Please try again.
      </Text>
    );
  }

  return null;
}
