import {
  createListAdapter,
  type ServerTableParams,
  type ServerTableResponse,
} from "@/components/ui/data-table";
import type { Service } from "@/api/services";

const listServices = createListAdapter<Service>("/services", "services");

export const getServices = (
  params: ServerTableParams,
  isActive: boolean | null,
): Promise<ServerTableResponse<Service>> =>
  listServices(params, {
    "filter[is_active]": isActive === null ? undefined : Number(isActive),
  });
