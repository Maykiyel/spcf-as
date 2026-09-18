import { useState } from "react";
import { Alert, Group, Modal, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconInfoCircle } from "@tabler/icons-react";
import {
  EditButton,
  DangerButton,
  PrimaryButton,
} from "@/components/ui/button";
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
  // The server's own words when it won't delete this service. Held rather
  // than toasted: a refusal answers the question just asked, in the dialog
  // that asked it.
  const [refusal, setRefusal] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

      <Modal
        opened={confirmDeleteOpen}
        onClose={closeDelete}
        title="Delete service"
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
            Delete <strong>{service.name}</strong>? This can't be undone. Use
            the Active toggle instead if you want a way back — it's the
            reversible option.
          </Text>
        )}

        <Group justify="flex-end" mt="lg">
          <DangerButton
            onClick={closeDelete}
            disabled={deleteMutation.isPending}
          >
            {refusal ? "Close" : "Cancel"}
          </DangerButton>
          {!refusal && (
            <PrimaryButton
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              Delete Service
            </PrimaryButton>
          )}
        </Group>
      </Modal>
    </>
  );
}
