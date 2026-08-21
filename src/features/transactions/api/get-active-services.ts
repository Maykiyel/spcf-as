import { apiClient } from "@/lib/axios/api-client";
import type { Service } from "@/api/services";

type ServicesIndexData = {
  services: Service[];
  pagination: { total: number };
};

// 100 is the backend's max per_page; there's no unpaginated "get everything"
// endpoint. Only the Fee Catalog panel needs the full active list at once
// (it filters/sorts client-side), so this stays feature-local rather than
// in the shared api/ tier — see CONTEXT.md's rule on when to promote there.
const ACTIVE_SERVICES_PAGE_SIZE = 100;

export const getActiveServices = async (): Promise<Service[]> => {
  const response = await apiClient.get<ServicesIndexData>("/services", {
    params: {
      per_page: ACTIVE_SERVICES_PAGE_SIZE,
      sort: "name",
      "filter[is_active]": 1,
    },
  });
  return response.data.services;
};
