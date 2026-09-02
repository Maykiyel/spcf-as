import { useState } from "react";
import { Alert, Group, Modal, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconInfoCircle } from "@tabler/icons-react";
import { DangerButton, PrimaryButton } from "@/components/ui/button";
import {
  notifySuccess,
  notifyMutationError,
  getErrorMessage,
} from "@/lib/notifications/notifications";
import { useAuthStore } from "@/stores/auth-store";
import { deleteUserAccount } from "../api/delete-user-account";
import { USER_ACCOUNTS_QUERY_KEY } from "../api/get-user-accounts";
import { toggleUserAccountStatus } from "../api/toggle-user-account-status";
import type { UserAccount } from "../types";

type UserAccountActionsCellProps = {
  account: UserAccount;
};

/**
 * Deactivate (or activate) as the obvious action, delete as the lesser one.
 * That ordering is the point: deactivation always works and is reversible,
 * while deletion is refused for anyone holding any history at all, which is
 * every cashier who has ever worked a shift.
 *
 * Neither action is offered on the signed-in admin's own row. The API
 * permits both, and either one locks them out of the product on the spot —
 * `EnsureAccountIsActive` refuses a deactivated user on every endpoint —
 * with no way back except another admin.
 */
export function UserAccountActionsCell({
  account,
}: UserAccountActionsCellProps) {
  const signedInUserId = useAuthStore((state) => state.user?.id);

  const [confirmDeleteOpen, confirmDelete] = useDisclosure(false);
  const [confirmDeactivateOpen, confirmDeactivate] = useDisclosure(false);
  // The server's own words when it won't delete this account. Held rather
  // than toasted: a refusal is an answer to the question the admin just
  // asked, so it belongs in the dialog they asked it from.
  const [refusal, setRefusal] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const closeDelete = () => {
    confirmDelete.close();
    setRefusal(null);
  };

  const deleteMutation = useMutation({
    mutationFn: () => deleteUserAccount(account.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_ACCOUNTS_QUERY_KEY });
      notifySuccess(`${account.full_name}'s account was deleted.`);
      closeDelete();
    },
    onError: (error) => {
      // Every failure here is shown in place, in the server's wording where
      // it has any. Dressing the "has history" refusal as an error would
      // tell an admin something went wrong when nothing did.
      setRefusal(
        getErrorMessage(error, "Couldn't delete this account. Please try again."),
      );
    },
  });

  const toggleMutation = useMutation({
    mutationFn: () =>
      toggleUserAccountStatus({
        id: account.id,
        isActive: !account.is_active,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: USER_ACCOUNTS_QUERY_KEY });
      notifySuccess(
        updated.is_active
          ? `${account.full_name}'s account was activated.`
          : `${account.full_name}'s account was deactivated.`,
      );
      confirmDeactivate.close();
    },
    onError: (error) => {
      // The row keeps showing the old status because the list is only
      // refetched on success — so the failure has to be said out loud, or
      // the admin walks away thinking the change took.
      notifyMutationError(error, "Couldn't change this account's status.");
      confirmDeactivate.close();
    },
  });

  if (signedInUserId === account.id) return null;

  return (
    <>
      <Group gap="xs" wrap="nowrap">
        {account.is_active ? (
          <DangerButton
            size="compact-sm"
            onClick={confirmDeactivate.open}
            loading={toggleMutation.isPending}
          >
            Deactivate
          </DangerButton>
        ) : (
          <PrimaryButton
            size="compact-sm"
            onClick={() => toggleMutation.mutate()}
            loading={toggleMutation.isPending}
          >
            Activate
          </PrimaryButton>
        )}

        <DangerButton
          variant="subtle"
          size="compact-sm"
          onClick={confirmDelete.open}
        >
          Delete
        </DangerButton>
      </Group>

      {/* Deactivation is confirmed; reactivation isn't. One cuts off a
          cashier mid-shift and suspends their receipt stock, the other
          only gives access back. */}
      <Modal
        opened={confirmDeactivateOpen}
        onClose={confirmDeactivate.close}
        title="Deactivate account"
        centered
        closeOnClickOutside={!toggleMutation.isPending}
      >
        <Stack gap="sm">
          <Text size="sm">
            Deactivate <strong>{account.full_name}</strong>? They won't be able
            to sign in until the account is activated again.
          </Text>
          {/* Only cashiers hold a series, and the backend validates that on
              assignment — so an admin row would be told something untrue. */}
          {account.role === "cashier" && (
            <Text size="sm">
              Their active series receipt will be suspended, and its unused
              sheets stay assigned to them until then.
            </Text>
          )}
        </Stack>

        <Group justify="flex-end" mt="lg">
          <DangerButton
            onClick={confirmDeactivate.close}
            disabled={toggleMutation.isPending}
          >
            Cancel
          </DangerButton>
          <PrimaryButton
            loading={toggleMutation.isPending}
            onClick={() => toggleMutation.mutate()}
          >
            Deactivate Account
          </PrimaryButton>
        </Group>
      </Modal>

      <Modal
        opened={confirmDeleteOpen}
        onClose={closeDelete}
        title="Delete account"
        centered
        closeOnClickOutside={!deleteMutation.isPending}
      >
        {refusal ? (
          <Alert
            color="tertiary"
            variant="light"
            icon={<IconInfoCircle size={18} />}
          >
            {refusal}
          </Alert>
        ) : (
          <Text size="sm">
            Delete the account for <strong>{account.full_name}</strong>? This
            can't be undone. Accounts with any history — transactions, series
            receipts, accounts they created — can't be deleted at all.
            Deactivating is almost always what you want instead.
          </Text>
        )}

        <Group justify="flex-end" mt="lg">
          <DangerButton onClick={closeDelete} disabled={deleteMutation.isPending}>
            {refusal ? "Close" : "Cancel"}
          </DangerButton>
          {!refusal && (
            <PrimaryButton
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              Delete Account
            </PrimaryButton>
          )}
        </Group>
      </Modal>
    </>
  );
}
