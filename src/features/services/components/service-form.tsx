import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  TextInput,
  NumberInput,
  Textarea,
  Group,
  SimpleGrid,
  Modal,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { PrimaryButton, DangerButton } from "@/components/ui/button";
import { IconRefresh, IconDeviceFloppy } from "@tabler/icons-react";
import {
  notifySuccess,
  notifyMutationError,
} from "@/lib/notifications/notifications";
import { ItemCodeCombobox, type ItemCodeSelection } from "./item-code-combobox";
import {
  buildCreatePayload,
  didItemCodeChange,
} from "../lib/service-form-logic";
import {
  createService,
  serviceInputSchema,
  type CreateServicePayload,
  type ServiceFormInput,
  type ServiceInputFields,
} from "../api/create-service";
import {
  updateService,
  type UpdateServicePayload,
} from "../api/update-service";
import type { Service } from "../types";

type ServiceFormProps = {
  editingService: Service | null;
  onDoneEditing: () => void;
};

export function ServiceForm({
  editingService,
  onDoneEditing,
}: ServiceFormProps) {
  const queryClient = useQueryClient();
  const isEditMode = editingService !== null;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceFormInput, unknown, ServiceInputFields>({
    resolver: zodResolver(serviceInputSchema),
    defaultValues: { name: "", price: 0, description: "" },
  });

  const [selection, setSelection] = useState<ItemCodeSelection | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [originalItemCode, setOriginalItemCode] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [pendingFields, setPendingFields] = useState<ServiceInputFields | null>(
    null,
  );
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] =
    useDisclosure(false);

  useEffect(() => {
    if (!editingService) {
      reset({ name: "", price: 0, description: "" });
      setSelection(null);
      setOriginalItemCode(null);
      return;
    }
    reset({
      name: editingService.name,
      price: editingService.price,
      description: editingService.description ?? "",
    });
    if (editingService.item_code) {
      const current: ItemCodeSelection = {
        kind: "existing",
        id: editingService.item_code.id,
        name: editingService.item_code.name,
      };
      setSelection(current);
      setOriginalItemCode(editingService.item_code);
    }
  }, [editingService, reset]);

  const invalidateAndNotify = (
    service: Service,
    verb: "created" | "updated",
  ) => {
    queryClient.invalidateQueries({ queryKey: ["services"] });
    // A new item code may have just been created as a side effect of
    // sending item_code_name on create.
    queryClient.invalidateQueries({ queryKey: ["item-codes"] });
    notifySuccess(`"${service.name}" was ${verb}.`);
  };

  const createMutation = useMutation({
    mutationFn: createService,
    onSuccess: (service) => {
      invalidateAndNotify(service, "created");
      reset({ name: "", price: 0, description: "" });
      setSelection(null);
    },
    onError: (error) => {
      notifyMutationError(error, "Couldn't create this service.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateServicePayload) =>
      updateService(editingService!.id, data),
    onSuccess: (service) => {
      invalidateAndNotify(service, "updated");
      onDoneEditing();
    },
    onError: (error) => {
      notifyMutationError(error, "Couldn't update this service.");
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const submitNow = (fields: ServiceInputFields) => {
    if (isEditMode) {
      // Edit's combobox never offers "create new"
      const existing = selection as Extract<
        ItemCodeSelection,
        { kind: "existing" }
      >;
      const payload: UpdateServicePayload = {
        ...fields,
        item_code_id: existing.id,
      };
      updateMutation.mutate(payload);
      return;
    }

    const payload: CreateServicePayload = buildCreatePayload(
      fields,
      selection!,
    );
    createMutation.mutate(payload);
  };

  const onSubmit = (fields: ServiceInputFields) => {
    setSelectionError(null);
    if (!selection) {
      setSelectionError("Select or create an item code");
      return;
    }
    const changedItemCode =
      isEditMode && didItemCodeChange(selection, originalItemCode);

    if (changedItemCode) {
      setPendingFields(fields);
      openConfirm();
      return;
    }
    submitNow(fields);
  };

  const handleConfirmMove = () => {
    closeConfirm();
    if (pendingFields) submitNow(pendingFields);
    setPendingFields(null);
  };

  const handleCancel = () => {
    if (isEditMode) {
      onDoneEditing();
    } else {
      reset({ name: "", price: 0, description: "" });
      setSelection(null);
    }
  };

  return (
    <>
      <Card.Root
        style={{
          border: isEditMode
            ? "2px solid #b4c4f1"
            : "1px solid var(--paper-border-color)",
        }}
      >
        <Card.Header title={isEditMode ? "Edit Service" : "Add Service"} />
        <Card.Divider />
        <Card.Body>
          <form onSubmit={handleSubmit(onSubmit)}>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              <ItemCodeCombobox
                value={selection}
                onChange={(next) => {
                  setSelection(next);
                  setSelectionError(null);
                }}
                error={selectionError ?? undefined}
                allowCreate={!isEditMode}
              />
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Service Name"
                    placeholder="e.g. SHS GRADUATION FEE"
                    {...field}
                    error={errors.name?.message}
                  />
                )}
              />
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <NumberInput
                    label="Price"
                    min={0}
                    decimalScale={2}
                    fixedDecimalScale
                    value={field.value as number | string}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    error={errors.price?.message}
                  />
                )}
              />
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Textarea
                    label="Description"
                    autosize
                    minRows={1}
                    {...field}
                    error={errors.description?.message}
                  />
                )}
              />
            </SimpleGrid>

            <Group justify="flex-end" mt="lg">
              <DangerButton
                type="button"
                onClick={handleCancel}
                leftSection={<IconRefresh size={16} />}
              >
                Cancel
              </DangerButton>
              <PrimaryButton
                type="submit"
                loading={isPending}
                leftSection={<IconDeviceFloppy size={16} />}
              >
                Save
              </PrimaryButton>
            </Group>
          </form>
        </Card.Body>
      </Card.Root>

      <Modal
        opened={confirmOpen}
        onClose={closeConfirm}
        title="Move service to a different item code"
        centered
      >
        <Text size="sm">
          Move <strong>{editingService?.name}</strong> from{" "}
          <strong>{originalItemCode?.name}</strong> to{" "}
          <strong>{selection?.name}</strong>?
        </Text>
        <Group justify="flex-end" mt="lg">
          <DangerButton onClick={closeConfirm}>Cancel</DangerButton>
          <PrimaryButton loading={isPending} onClick={handleConfirmMove}>
            Move
          </PrimaryButton>
        </Group>
      </Modal>
    </>
  );
}
