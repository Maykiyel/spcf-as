import { Group, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DangerButton } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  notifySuccess,
  notifyMutationError,
} from "@/lib/notifications/notifications";
import { formatCurrency } from "@/utils/currency";
import {
  TRANSACTIONS_QUERY_KEY,
  transactionDetailQueryKey,
} from "../api/transaction-query-keys";
import { voidTransaction } from "../api/void-transaction";
import type { TransactionListRow } from "../types";

type VoidTransactionActionProps = {
  transaction: TransactionListRow;
};

/** Four of these rather than a sentence: they are read to be matched
 * against a receipt on the desk, and prose is harder to check. */
function ConfirmDetail({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" gap="xl" wrap="nowrap">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={500} ta="right">
        {value}
      </Text>
    </Group>
  );
}

/**
 * The Void button on one row, and the confirmation behind it. That dialog
 * is the only checkpoint there is: no un-void endpoint, no request body,
 * nothing downstream to catch a mistake. Hence four identifiers rather
 * than "are you sure", since the adjacent row is the same cashier on the
 * same day with a series number one away. Alternatives weighed on #62.
 *
 * The button is named per row, so it identifies itself to anything that
 * can't see which row it is in.
 */
export function VoidTransactionAction({
  transaction,
}: VoidTransactionActionProps) {
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] =
    useDisclosure(false);
  const queryClient = useQueryClient();

  /** Lists invalidated, detail entry **removed**. Invalidation only marks
   * an inactive query, so the next mount would paint the pre-void data,
   * and `isPrintable` would leave Print live on a reversed payment.
   *
   * The lists keep plain invalidation: a badge correcting itself behind
   * the user has no action hanging off it. */
  const forgetWhatWeKnew = () => {
    queryClient.invalidateQueries({ queryKey: [...TRANSACTIONS_QUERY_KEY] });
    queryClient.removeQueries({
      queryKey: transactionDetailQueryKey(transaction.control_id),
    });
  };

  const voidMutation = useMutation({
    mutationFn: () => voidTransaction(transaction.control_id),
    onSuccess: () => {
      forgetWhatWeKnew();
      closeConfirm();
      notifySuccess(`Transaction ${transaction.control_id} was voided.`);
    },
    onError: (error) => {
      // The 409 names the status it found, which is how an admin learns
      // someone voided this row first. Shown as written.
      notifyMutationError(error, "Couldn't void this transaction.");
      // A refusal is itself evidence the list is stale: every row here is
      // meant to be voidable, and the server just said this one isn't.
      forgetWhatWeKnew();
      closeConfirm();
    },
  });

  return (
    <>
      <DangerButton
        size="xs"
        aria-label={`Void transaction ${transaction.control_id}`}
        onClick={openConfirm}
      >
        Void
      </DangerButton>

      <ConfirmModal
        opened={confirmOpen}
        onClose={closeConfirm}
        title="Void transaction"
        confirmLabel="Void Transaction"
        onConfirm={() => voidMutation.mutate()}
        loading={voidMutation.isPending}
      >
        <Stack gap="sm">
          <Text size="sm">
            This reverses a completed payment record and can't be undone.
            Check it against the receipt before continuing.
          </Text>

          <Stack gap={4}>
            <ConfirmDetail
              label="Control ID"
              value={String(transaction.control_id)}
            />
            <ConfirmDetail
              label="Series No."
              // Never null here, but the row type allows it and a blank
              // line beside a label reads as a bug.
              value={
                transaction.series_number === null
                  ? "—"
                  : String(transaction.series_number)
              }
            />
            <ConfirmDetail
              label="Payer"
              value={transaction.customer_name ?? "—"}
            />
            <ConfirmDetail
              label="Total"
              value={
                transaction.total === null
                  ? "—"
                  : formatCurrency(transaction.total)
              }
            />
          </Stack>
        </Stack>
      </ConfirmModal>
    </>
  );
}
