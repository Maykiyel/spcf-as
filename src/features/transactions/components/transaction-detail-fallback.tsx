import type { ReactNode } from "react";
import { Center, Group, Loader, Text } from "@mantine/core";
import type { useTransactionDetail } from "../hooks/use-transaction-detail";

type TransactionDetailFallbackProps = {
  // The hook's whole result, not three separate booleans: the states are
  // mutually exclusive and always travel together, so splitting them into
  // props would just be a clump waiting to be passed inconsistently.
  detail: ReturnType<typeof useTransactionDetail>;
  /** What to show while the transaction is loading, for a page whose
   * layout is worth mirroring.
   *
   * Only the *loading* state is a caller's to shape. The 403 and the
   * failure stay fixed here, because those are classifications and the
   * whole reason this component exists is that the two pages must not
   * word them differently. A layout is the opposite case: the View page is
   * a normal screen page and the Print page is two compact copies on 8.5
   * by 4 inch stock, so a skeleton drawn for one would be a lie on the
   * other. Omitted, this falls back to the spinner both pages used before
   * either had a shape worth drawing. */
  loading?: ReactNode;
};

// The loading / no-access / failed states shared by the View Transaction
// and Print Acknowledgement Receipt pages. useTransactionDetail already
// exists so the two pages classify a 403 identically — this is the other
// half of that: without it the two pages would still be free to *word*
// the same classification differently, which is the drift the hook was
// extracted to prevent.
//
// Render this only when `detail.isUnavailable` is true; it always renders
// one of the three states below and never returns null. The hook owns that
// condition so the two pages and this component can't disagree about it.
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
