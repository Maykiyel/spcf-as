import { apiClient } from "@/lib/axios/api-client";
import { encodeSortsForApi } from "./sort-params";
import type {
  ServerTableParams,
  ServerTableResponse,
} from "./use-server-table-state";

type ListAdapterOptions = {
  /** Whether this endpoint accepts `filter[search]`. Only item codes,
   * services and series receipts do; elsewhere an unknown filter key is a
   * 400, not an ignored parameter. See BACKEND_NOTES.md. */
  supportsSearch?: boolean;
};

// Every list endpoint returns the same envelope and takes the same params,
// so a feature's getX names only its endpoint and response key. Declared
// filters go out as `filter[<key>]`.
//
// `extra` has no consumers today; it is still right for a parameter that
// isn't a `filter[...]`. A `null` filter must be absent rather than empty,
// since an unknown or empty key is a 400.
function toFilterParams(
  filters: ServerTableParams["filters"],
): Record<string, string> {
  if (!filters) return {};

  return Object.fromEntries(
    Object.entries(filters)
      .filter((entry): entry is [string, string] => entry[1] !== null)
      .map(([key, value]) => [`filter[${key}]`, value]),
  );
}

export function createListAdapter<T>(
  url: string,
  responseKey: string,
  { supportsSearch = false }: ListAdapterOptions = {},
) {
  return async (
    params: ServerTableParams,
    extra?: Record<string, unknown>,
  ): Promise<ServerTableResponse<T>> => {
    const response = await apiClient.get<Record<string, unknown>>(url, {
      params: {
        per_page: params.per_page,
        page: params.page,
        sort: encodeSortsForApi(params.sorts),
        ...(supportsSearch && params.search
          ? { "filter[search]": params.search }
          : {}),
        ...toFilterParams(params.filters),
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
