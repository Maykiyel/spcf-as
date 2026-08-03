import { SegmentedControl } from "@mantine/core";
import { useServiceStatusFilter } from "./use-service-status-filter";

type ServiceStatusFilterProps = {
  urlKey: string;
};

export function ServiceStatusFilter({ urlKey }: ServiceStatusFilterProps) {
  const { status, setStatus } = useServiceStatusFilter(urlKey);

  return (
    <SegmentedControl
      size="xs"
      value={status}
      onChange={(val) => setStatus(val as "all" | "active" | "inactive")}
      data={[
        { label: "All", value: "all" },
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ]}
    />
  );
}
