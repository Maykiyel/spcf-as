import { useState } from "react";
import { Stack, Title } from "@mantine/core";
import { ServiceForm } from "@/features/services/components/service-form";
import { ServiceTable } from "@/features/services/components/service-table";
import type { Service } from "@/api/services";

export const Component = () => {
  const [editingService, setEditingService] = useState<Service | null>(null);

  return (
    <Stack gap="lg">
      <Title order={3}>Services</Title>
      <ServiceForm
        key={editingService?.id ?? "new"}
        editingService={editingService}
        onDoneEditing={() => setEditingService(null)}
      />
      <ServiceTable onEdit={setEditingService} />
    </Stack>
  );
};
