import { useState } from "react";
import { Stack, Title } from "@mantine/core";
import { ItemCodeForm } from "@/features/item-codes/components/item-code-form";
import { ItemCodeTable } from "@/features/item-codes/components/item-code-table";
import type { ItemCode } from "@/api/item-codes";

export const Component = () => {
  const [editingItemCode, setEditingItemCode] = useState<ItemCode | null>(null);

  return (
    <Stack gap="lg">
      <Title order={3}>Item Codes</Title>
      <ItemCodeForm
        key={editingItemCode?.id ?? "new"}
        editingItemCode={editingItemCode}
        onDoneEditing={() => setEditingItemCode(null)}
      />
      <ItemCodeTable onEdit={setEditingItemCode} />
    </Stack>
  );
};
