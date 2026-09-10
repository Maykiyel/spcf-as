import { apiClient } from "@/lib/axios/api-client";
import { encodeSortsForApi } from "./sort-params";
import type {
  ServerTableParams,
  ServerTableResponse,
} from "./use-server-table-state";

type ListAdapterOptions<TWire, TRow, TMeta> = {
  /** Whether this endpoint accepts `filter[search]`. Only item codes,
   * services and series receipts do; elsewhere an unknown filter key is a
   * 400, not an ignored parameter. See BACKEND_NOTES.md. */
  supportsSearch?: boolean;
  /** Reads a value the envelope carries beside the rows, such as the
   * transactions report's server-computed `total_earnings`. Omitted by
   * every endpoint whose envelope holds nothing but rows. */
  selectMeta?: (body: Record<string, unknown>) => TMeta;
  /** Renames a wire row to the shape the table reads. A column's sort key
   * must be a word the endpoint allow-lists, so a field the wire and the UI
   * name differently is renamed here rather than at the column. */
  selectRow?: (row: TWire) => TRow;
  /** Filters applied past the point the URL reaches, for a list whose scope
   * is the page's own rather than the user's. Declaring a key that is also
   * pinned throws on the first request: the control would render and do
   * nothing, which is the failure an undeclared key already throws for. */
  pinnedFilters?: Record<string, string>;
};

// Every list endpoint returns the same envelope and takes the same params,
// so a feature's getX names only its endpoint and response key. Declared
// filters go out as `filter[<key>]`. A `null` filter must be absent rather
// than empty, since an unknown or empty key is a 400.
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

export function createListAdapter<TWire, TRow = TWire, TMeta = undefined>(
  url: string,
  responseKey: string,
  {
    supportsSearch = false,
    selectMeta,
    selectRow,
    pinnedFilters,
  }: ListAdapterOptions<TWire, TRow, TMeta> = {},
) {
  return async (
    params: ServerTableParams,
  ): Promise<ServerTableResponse<TRow, TMeta>> => {
    const alsoDeclared = Object.keys(pinnedFilters ?? {}).filter(
      (key) => params.filters && key in params.filters,
    );
    if (alsoDeclared.length > 0) {
      throw new Error(
        `${url}: ${alsoDeclared.join(", ")} is both pinned and declared. A declared key reaches the URL, so its control would render and do nothing.`,
      );
    }

    const response = await apiClient.get<Record<string, unknown>>(url, {
      params: {
        per_page: params.per_page,
        page: params.page,
        sort: encodeSortsForApi(params.sorts),
        ...(supportsSearch && params.search
          ? { "filter[search]": params.search }
          : {}),
        ...toFilterParams(params.filters),
        // Last, so precedence is not an accident of key order.
        ...toFilterParams(pinnedFilters),
      },
    });

    const pagination = response.data.pagination as { total: number };
    const rows = response.data[responseKey] as TWire[];

    return {
      data: (selectRow ? rows.map(selectRow) : rows) as TRow[],
      total: pagination.total,
      meta: selectMeta?.(response.data),
    };
  };
}
