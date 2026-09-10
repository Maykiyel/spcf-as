import { useTableFilters } from "@/components/ui/data-table";
import { ServiceStatusFilter } from "./service-status-filter";

/** `is_active`, the only filter this table declares. A panel rather than an
 * inline binding on the table, so every filter in the app reaches its table
 * the same way. */
export function ServiceFilterPanel() {
  const filter = useTableFilters();

  return <ServiceStatusFilter {...filter("is_active")} />;
}
