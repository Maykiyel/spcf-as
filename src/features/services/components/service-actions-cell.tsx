import { EditButton } from "@/components/ui/button";
import type { Service } from "../types";

type ServiceActionsCellProps = {
  service: Service;
  onEdit: (service: Service) => void;
};

export function ServiceActionsCell({
  service,
  onEdit,
}: ServiceActionsCellProps) {
  return (
    <EditButton
      onClick={() => {
        onEdit(service);
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      }}
    />
  );
}
