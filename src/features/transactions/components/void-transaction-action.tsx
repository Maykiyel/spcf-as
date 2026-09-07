import { Group, Modal, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DangerButton, PrimaryButton } from "@/components/ui/button";
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

/** One labelled identifier in the confirmation.
 *
 * Four of these rather than a sentence, because they are being read to be
 * matched against something — a receipt on the desk, or a payer on the
 * phone — and a value buried in prose is harder to check than one in a
 * column. */
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
 * The Void button on one row, and the confirmation behind it.
 *
 * **The confirmation is the only checkpoint that exists.** There is no
 * un-void endpoint, and `POST /void` takes no body, so nothing downstream
 * can capture a reason, ask a second time, or undo it. That is why the
 * dialog carries four identifiers rather than asking "are you sure": rows
 * in a dense table look alike, and the adjacent one is the same cashier on
 * the same day with a series number one away.
 *
 * Type-to-confirm was considered and rejected on #62: the action is
 * already admin-gated and already written to the activity log, so the
 * extra friction buys little. An inline two-click confirm on the row was
 * rejected as too easy to trigger by accident.
 *
 * The button is named per row rather than reading "Void" to everything
 * that can't see which row it sits in. `DataTable.Grid` ignores a row
 * click that lands on a button, so this coexists with the row navigating
 * to the transaction.
 */
export function VoidTransactionAction({
  transaction,
}: VoidTransactionActionProps) {
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] =
    useDisclosure(false);
  const queryClient = useQueryClient();

  /** What this transaction's caches are worth once the server has spoken
   * about it, on either path.
   *
   * **The lists are invalidated and the detail entry is removed**, which is
   * not the same thing and the difference is the whole point.
   *
   * `invalidateQueries` defaults to `refetchType: "active"`. Voiding
   * happens on this page, so the detail query is *inactive* at that moment
   * and invalidation only marks it. React Query then hands a remount that
   * cached entry synchronously and revalidates behind it, so opening the
   * transaction paints the pre-void data first and corrects itself a
   * moment later. Reported from a browser: the View page showed
   * "Completed" on a transaction that had just been voided.
   *
   * A moment of a wrong badge would be bad enough against #62's "see it
   * reflected immediately". It is worse than cosmetic: `isPrintable` is
   * `status === "completed"`, so for that window the Print button is live
   * on a reversed payment, and the print page reads this same entry.
   *
   * Removing it leaves nothing to render stale. The detail page shows its
   * ordinary loading fallback, which offers no Print button at all, and
   * then the real voided transaction. `refetchType: "all"` would also
   * refetch it, but it would refetch every other inactive transaction
   * query too, and it would still lose the race against a fast navigation
   * because the stale entry stays readable until the response lands.
   *
   * The lists keep plain invalidation on purpose. The one on screen
   * refetches at once; the others are marked and refetch when next shown,
   * and a list correcting one row's badge behind the user is the ordinary
   * stale-while-revalidate trade, with no action hanging off it. */
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
      // A 409 from `ensureActionAllowed` names the status it found, which
      // is how an admin learns another admin voided this row first. Worth
      // more than a generic failure, so it is shown as written.
      notifyMutationError(error, "Couldn't void this transaction.");
      // The same forgetting as a success, because a refusal here is itself
      // evidence that what we hold is stale: every row on this page is
      // meant to be voidable, and the server has just said this one is
      // not. That makes the cached detail as suspect as the list row.
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

      <Modal
        opened={confirmOpen}
        onClose={closeConfirm}
        title="Void transaction"
        centered
        closeOnClickOutside={!voidMutation.isPending}
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
              // Never null on this page — every row is `completed`, and a
              // series number is assigned at save time. Rendered for the
              // absent case anyway, because the row type allows it and a
              // blank line beside a label reads as a bug.
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

        <Group justify="flex-end" mt="lg">
          <DangerButton
            onClick={closeConfirm}
            disabled={voidMutation.isPending}
          >
            Cancel
          </DangerButton>
          <PrimaryButton
            loading={voidMutation.isPending}
            onClick={() => voidMutation.mutate()}
          >
            Void Transaction
          </PrimaryButton>
        </Group>
      </Modal>
    </>
  );
}
