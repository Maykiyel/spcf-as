import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextInput, Textarea, Group, SimpleGrid } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { PrimaryButton, DangerButton } from "@/components/ui/button";
import { IconRefresh, IconDeviceFloppy } from "@tabler/icons-react";
import {
  notifySuccess,
  notifyMutationError,
} from "@/lib/notifications/notifications";
import {
  createItemCode,
  itemCodeInputSchema,
  type ItemCodeInput,
} from "../api/create-item-code";
import { updateItemCode } from "../api/update-item-code";
import type { ItemCode } from "../types";

type ItemCodeFormProps = {
  editingItemCode: ItemCode | null;
  onDoneEditing: () => void;
};

export function ItemCodeForm({
  editingItemCode,
  onDoneEditing,
}: ItemCodeFormProps) {
  const queryClient = useQueryClient();
  const isEditMode = editingItemCode !== null;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ItemCodeInput>({
    resolver: zodResolver(itemCodeInputSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (editingItemCode) {
      reset({
        name: editingItemCode.name,
        description: editingItemCode.description ?? "",
      });
    } else {
      reset({ name: "", description: "" });
    }
  }, [editingItemCode, reset]);

  const createMutation = useMutation({
    mutationFn: createItemCode,
    onSuccess: (itemCode) => {
      queryClient.invalidateQueries({ queryKey: ["item-codes"] });
      reset();
      notifySuccess(`"${itemCode.name}" was created.`);
    },
    onError: (error) => {
      notifyMutationError(error, "Couldn't create this item code.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ItemCodeInput) =>
      updateItemCode(editingItemCode!.id, data),
    onSuccess: (itemCode) => {
      queryClient.invalidateQueries({ queryKey: ["item-codes"] });
      onDoneEditing();
      notifySuccess(`"${itemCode.name}" was updated.`);
    },
    onError: (error) => {
      notifyMutationError(error, "Couldn't update this item code.");
    },
  });

  const onSubmit = (data: ItemCodeInput) => {
    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCancel = () => {
    if (isEditMode) {
      onDoneEditing();
    } else {
      reset();
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Card.Root
      style={{
        border: isEditMode
          ? "2px solid #b4c4f1"
          : "1px solid var(--paper-border-color)",
      }}
    >
      <Card.Header title={isEditMode ? "Edit Item Code" : "Add Item Code"} />
      <Card.Divider />
      <Card.Body>
        <form onSubmit={handleSubmit(onSubmit)}>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Item Code Name"
                  placeholder="e.g. GRADUATION FEE"
                  {...field}
                  error={errors.name?.message}
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
  );
}
