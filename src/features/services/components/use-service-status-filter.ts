import { useSearchParams } from "react-router";

const STATUS_VALUES = ["all", "active", "inactive"] as const;
export type ServiceStatusValue = (typeof STATUS_VALUES)[number];

function isStatusValue(value: string | null): value is ServiceStatusValue {
  return value !== null && (STATUS_VALUES as readonly string[]).includes(value);
}

export function useServiceStatusFilter(urlKey: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramName = `${urlKey}_status`;
  const raw = searchParams.get(paramName);
  const status: ServiceStatusValue = isStatusValue(raw) ? raw : "all";

  const setStatus = (next: ServiceStatusValue) => {
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev);
      if (next === "all") {
        updated.delete(paramName);
      } else {
        updated.set(paramName, next);
      }
      return updated;
    });
  };

  const isActive: boolean | null =
    status === "all" ? null : status === "active";

  return { status, setStatus, isActive };
}
