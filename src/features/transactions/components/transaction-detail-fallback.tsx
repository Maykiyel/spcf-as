import type { ReactNode } from "react";
import { Center, Group, Loader, Text } from "@mantine/core";
import type { useTransactionDetail } from "../hooks/use-transaction-detail";

type TransactionDetailFallbackProps = {
  // The hook's whole result, not three booleans that travel together.
  detail: ReturnType<typeof useTransactionDetail>;
  /** What to show while loading. Only this state is the caller's to shape:
   * the 403 and the failure stay fixed here, because not wording those two
   * ways is why this component exists. A layout is the opposite case, the
   * two pages having very different ones. Omitted, it is a spinner. */
  loading?: ReactNode;
};

// The loading / no-access / failed states shared by the View and Print
// pages, so the two can't word the same classification differently.
//
// Render only when `detail.isUnavailable` is true; the hook owns that
// condition, and this always renders one of the three states.
export function TransactionDetailFallback({
  detail,
  loading,
}: TransactionDetailFallbackProps) {
  const { isLoading, isForbidden } = detail;

  if (isLoading) {
    if (loading) return <>{loading}</>;

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

  return (
    <Text ta="center" c="danger" py="xl">
      Couldn't load this transaction. Please try again.
    </Text>
  );
}
