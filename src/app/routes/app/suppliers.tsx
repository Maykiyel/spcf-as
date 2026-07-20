import { useState } from "react";
import { Stack, Title } from "@mantine/core";
import { SupplierForm } from "@/features/suppliers/components/supplier-form";
import { SupplierTable } from "@/features/suppliers/components/supplier-table";
import type { Supplier } from "@/features/suppliers/types";

export const Component = () => {
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  return (
    <Stack gap="lg">
      <Title order={3}>Supplier</Title>
      <SupplierForm
        key={editingSupplier?.id ?? "new"}
        editingSupplier={editingSupplier}
        onDoneEditing={() => setEditingSupplier(null)}
      />
      <SupplierTable onEdit={setEditingSupplier} />
    </Stack>
  );
};
