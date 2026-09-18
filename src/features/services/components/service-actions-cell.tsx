import { useState } from "react";
import { Group, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EditButton, DangerButton } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  notifySuccess,
  getErrorMessage,
} from "@/lib/notifications/notifications";
import { deleteService } from "../api/delete-service";
import type { Service } from "@/api/services";

type ServiceActionsCellProps = {
  service: Service;
  onEdit: (service: Service) => void;
  onDeleted: (service: Service) => void;
};

/** Mirrors the Manage Accounts delete flow; see #140. This catalog's
 * reversible alternative is the Active toggle, a switch in another
 * column, so the dialog copy names it rather than offering a button. */
export function ServiceActionsCell({
  service,
  onEdit,
  onDeleted,
}: ServiceActionsCellProps) {
  const [confirmDeleteOpen, confirmDelete] = useDisclosure(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Clearing here, not on open: a stale refusal would otherwise greet the
  // next open of this dialog.
  const closeDelete = () => {
    confirmDelete.close();
    setRefusal(null);
  };

  const deleteMutation = useMutation({
    mutationFn: () => deleteService(service.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      // Same pair `service-active-toggle.tsx` invalidates: a deleted
      // service still sitting in the fee catalog could be charged again.
      queryClient.invalidateQueries({
        queryKey: ["transactions", "fee-catalog"],
      });
      notifySuccess(`"${service.name}" was deleted.`);
      onDeleted(service);
      closeDelete();
    },
    onError: (error) => {
      setRefusal(
        getErrorMessage(
          error,
          "Couldn't delete this service. Please try again.",
        ),
      );
    },
  });

  return (
    <>
      <Group gap="xs" wrap="nowrap">
        <EditButton
          onClick={() => {
            onEdit(service);
            window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
          }}
        />
        <DangerButton
          variant="subtle"
          size="compact-sm"
          onClick={confirmDelete.open}
        >
          Delete
        </DangerButton>
      </Group>

      <ConfirmModal
        opened={confirmDeleteOpen}
        onClose={closeDelete}
        title="Delete service"
        confirmLabel="Delete Service"
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        refusal={refusal}
      >
        <Text size="sm">
          Delete <strong>{service.name}</strong>? This can't be undone. Use the
          Active toggle instead if you want a way back — it's the reversible
          option.
        </Text>
      </ConfirmModal>
    </>
  );
}
