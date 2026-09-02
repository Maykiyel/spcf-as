import { apiClient } from "@/lib/axios/api-client";
import { encodeSortsForApi } from "./sort-params";
import type {
  ServerTableParams,
  ServerTableResponse,
} from "./use-server-table-state";

type ListAdapterOptions = {
  /** Whether this endpoint accepts `filter[search]`. Only three do — item
   * codes, services and series receipts. Everywhere else an unknown filter
   * key is a 400, not a silently ignored parameter (see BACKEND_NOTES.md),
   * so the key is never sent unless the endpoint says it takes one. */
  supportsSearch?: boolean;
};

// Every server-backed DataTable list endpoint returns the same envelope:
// `{ [responseKey]: T[], pagination: { total } }`, and is queried with the
// same `per_page` / `page` / `sort` params. This factory owns that shared
// shape so each feature's getX only has to name its own endpoint and
// response key.
//
// Declared filters (`params.filters`) are sent as `filter[<key>]`, which is
// what every filterable endpoint in this API calls them, so a table that
// declares its filters needs no per-feature mapping to reach the wire. A
// caller with real variance — a parameter that isn't a `filter[...]`, or a
// value the endpoint wants in a different shape — merges it in via `extra`
// on a call-by-call basis rather than the factory growing an option for it.
// `null` is "not set", and an unknown filter key is a 400 rather than a
// silently ignored parameter (see BACKEND_NOTES.md) — so an unset filter has
// to be absent from the request, not present and empty.
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
