import { Group, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EditButton, DangerButton } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  notifySuccess,
  notifyMutationError,
} from "@/lib/notifications/notifications";
import { deleteItemCode } from "../api/delete-item-code";
import type { ItemCode } from "@/api/item-codes";

type ItemCodeActionsCellProps = {
  itemCode: ItemCode;
  onEdit: (itemCode: ItemCode) => void;
};

export function ItemCodeActionsCell({
  itemCode,
  onEdit,
}: ItemCodeActionsCellProps) {
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] =
    useDisclosure(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteItemCode(itemCode.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-codes"] });
      closeConfirm();
      notifySuccess(`"${itemCode.name}" was deleted.`);
    },
    onError: (error) => {
      // A 409 (still referenced by services) carries a specific, useful
      // message from ItemCodeController::destroy — surface it verbatim
      // rather than a generic failure toast.
      notifyMutationError(error, "Couldn't delete this item code.");
      closeConfirm();
    },
  });

  return (
    <>
      <Group gap="xs">
        <EditButton
          onClick={() => {
            onEdit(itemCode);
            window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
          }}
        />
        <DangerButton onClick={openConfirm}>Delete</DangerButton>
      </Group>

      <ConfirmModal
        opened={confirmOpen}
        onClose={closeConfirm}
        title="Delete item code"
        confirmLabel="Delete"
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      >
        <Text size="sm">
          Delete <strong>{itemCode.name}</strong>? This can't be undone. If any
          services still belong to this item code, deletion will be blocked
          until they're removed or reassigned.
        </Text>
      </ConfirmModal>
    </>
  );
}
