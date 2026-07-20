import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextInput, Textarea, Group, SimpleGrid } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { PrimaryButton, DangerButton } from "@/components/ui/button";
import { IconRefresh, IconDeviceFloppy } from "@tabler/icons-react";
import {
  createSupplier,
  supplierInputSchema,
  type SupplierInput,
} from "../api/create-supplier";
import { updateSupplier } from "../api/update-supplier";
import type { Supplier } from "../types";

type SupplierFormProps = {
  editingSupplier: Supplier | null;
  onDoneEditing: () => void;
};

export function SupplierForm({
  editingSupplier,
  onDoneEditing,
}: SupplierFormProps) {
  const queryClient = useQueryClient();
  const isEditMode = editingSupplier !== null;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierInput>({
    resolver: zodResolver(supplierInputSchema),
    defaultValues: { name: "", contact_no: "", email: "", description: "" },
  });

  useEffect(() => {
    if (editingSupplier) {
      reset({
        name: editingSupplier.name,
        contact_no: editingSupplier.contact_no,
        email: editingSupplier.email,
        description: editingSupplier.description ?? "",
      });
    } else {
      reset({ name: "", contact_no: "", email: "", description: "" });
    }
  }, [editingSupplier, reset]);

  const createMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: SupplierInput) =>
      updateSupplier(editingSupplier!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      onDoneEditing();
    },
  });

  const onSubmit = (data: SupplierInput) => {
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
      <Card.Header title={isEditMode ? "Edit Supplier" : "Add Supplier"} />
      <Card.Divider />
      <Card.Body>
        <form onSubmit={handleSubmit(onSubmit)}>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Supplier Name"
                  {...field}
                  error={errors.name?.message}
                />
              )}
            />
            <Controller
              name="contact_no"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Contact No."
                  placeholder="+63 9XX XXX XXXX"
                  inputMode="tel"
                  {...field}
                  onChange={(e) => {
                    // Strip anything that isn't a digit, +, space, parenthesis, or dash
                    const cleaned = e.currentTarget.value.replace(
                      /[^\d+\s()-]/g,
                      "",
                    );
                    field.onChange(cleaned);
                  }}
                  error={errors.contact_no?.message}
                />
              )}
            />
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Email Address"
                  {...field}
                  error={errors.email?.message}
                />
              )}
            />
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Textarea
                  label="Additional Information"
                  placeholder="e.g. Address"
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
