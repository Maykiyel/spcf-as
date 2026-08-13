import { apiClient } from "@/lib/axios/api-client";
import { encodeSortsForApi } from "./sort-params";
import type {
  ServerTableParams,
  ServerTableResponse,
} from "./use-server-table-state";

// Every server-backed DataTable list endpoint returns the same envelope:
// `{ [responseKey]: T[], pagination: { total } }`, and is queried with the
// same `per_page` / `page` / `sort` / `filter[search]` params. This factory
// owns that shared shape so each feature's getX only has to name its own
// endpoint and response key.
//
// A caller with real per-endpoint variance (e.g. an extra filter no other
// endpoint has) merges it in via `extra` on a call-by-call basis rather than
// the factory growing a bespoke option for it — see getServices.
export function createListAdapter<T>(url: string, responseKey: string) {
  return async (
    params: ServerTableParams,
    extra?: Record<string, unknown>,
  ): Promise<ServerTableResponse<T>> => {
    const response = await apiClient.get<Record<string, unknown>>(url, {
      params: {
        per_page: params.per_page,
        page: params.page,
        sort: encodeSortsForApi(params.sorts),
        "filter[search]": params.search,
        ...extra,
      },
    });

    const pagination = response.data.pagination as { total: number };

    return {
      data: response.data[responseKey] as T[],
      total: pagination.total,
    };
  };
}
