import { useState } from "react";
import { Alert, Group, Modal, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconInfoCircle } from "@tabler/icons-react";
import { DangerButton, PrimaryButton } from "@/components/ui/button";
import {
  notifySuccess,
  getErrorMessage,
} from "@/lib/notifications/notifications";
import { deleteUserAccount } from "../api/delete-user-account";
import { USER_ACCOUNTS_QUERY_KEY } from "../api/get-user-accounts";
import type { UserAccount } from "../types";

type UserAccountActionsCellProps = {
  account: UserAccount;
};

/**
 * Deletion, and for now only deletion. Activate/deactivate is the primary
 * way to revoke access and belongs beside this as the solid button — it
 * waits on the directory endpoint returning `is_active` (see #78). Until
 * then this stays subtle, which is where it belongs anyway: almost no
 * account can actually be deleted.
 */
export function UserAccountActionsCell({
  account,
}: UserAccountActionsCellProps) {
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] =
    useDisclosure(false);
  // The server's own words when it won't delete this account. Held rather
  // than toasted: a refusal is an answer to the question the admin just
  // asked, so it belongs in the dialog they asked it from.
  const [refusal, setRefusal] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const close = () => {
    closeConfirm();
    setRefusal(null);
  };

  const deleteMutation = useMutation({
    mutationFn: () => deleteUserAccount(account.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_ACCOUNTS_QUERY_KEY });
      notifySuccess(`${account.full_name}'s account was deleted.`);
      close();
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

  return (
    <>
      <DangerButton variant="subtle" size="compact-sm" onClick={openConfirm}>
        Delete
      </DangerButton>

      <Modal
        opened={confirmOpen}
        onClose={close}
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
          </Text>
        )}

        <Group justify="flex-end" mt="lg">
          <DangerButton onClick={close} disabled={deleteMutation.isPending}>
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
