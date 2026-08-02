import { Switch } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleServiceActive } from "../api/toggle-service-active";
import { notifyMutationError } from "@/lib/notifications/notifications";
import type { Service } from "../types";

type ServiceActiveToggleProps = {
  service: Service;
};

export function ServiceActiveToggle({ service }: ServiceActiveToggleProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (nextActive: boolean) =>
      toggleServiceActive(service.id, nextActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (error) => {
      notifyMutationError(error, "Couldn't update active status.");
    },
  });

  return (
    <Switch
      checked={service.is_active}
      onChange={(e) => mutation.mutate(e.currentTarget.checked)}
      disabled={mutation.isPending}
      color="success"
      size="lg"
      onLabel="ON"
      offLabel="OFF"
      withThumbIndicator={false}
      aria-label={`Toggle active status for ${service.name}`}
    />
  );
}
