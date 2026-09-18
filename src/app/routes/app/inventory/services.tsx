import { useState } from "react";
import { Stack, Title } from "@mantine/core";
import { ServiceForm } from "@/features/services/components/service-form";
import { ServiceTable } from "@/features/services/components/service-table";
import type { Service } from "@/api/services";

export const Component = () => {
  const [editingService, setEditingService] = useState<Service | null>(null);

  // A deletion elsewhere in the table can outrun the form: if the row
  // just deleted is the one loaded above, the form would otherwise still
  // offer a save that can only fail against a record that's gone.
  const handleDeleted = (deleted: Service) => {
    setEditingService((current) =>
      current?.id === deleted.id ? null : current,
    );
  };

  return (
    <Stack gap="lg">
      <Title order={3}>Services</Title>
      <ServiceForm
        key={editingService?.id ?? "new"}
        editingService={editingService}
        onDoneEditing={() => setEditingService(null)}
      />
      <ServiceTable onEdit={setEditingService} onDeleted={handleDeleted} />
    </Stack>
  );
};
