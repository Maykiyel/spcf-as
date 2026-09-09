import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { MAX_SORT_COLUMNS, type SortEntry, type TableFilters } from "./types";

export type TableControls = {
  page: number;
  pageSize: number;
  searchQuery: string;
  sorts: SortEntry[];
  filters: TableFilters;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSearchChange: (query: string) => void;
  onSort: (key: string) => void;
  resetSort: () => void;
  /** Merges a patch in. A patch, not a single key/value: a date range
   * moves both ends at once and two writes would mean two refetches. */
  setFilters: (patch: TableFilters) => void;
};

type TableControlsAdapter = TableControls;

// Both adapters drop undeclared keys. Reading ignores them anyway, so
// writing one would put a param in the URL that nothing reads back.
const declaredOnly = (
  patch: TableFilters,
  initialFilters: TableFilters,
): TableFilters =>
  Object.fromEntries(
    Object.entries(patch).filter(([key]) => key in initialFilters),
  );

/** A table's URL params are `<urlKey>_<name>`, filters sharing a namespace
 * with `page`, `size`, `q` and `sort`. None collide today. Exported so a
 * link built outside a table can address one without restating the shape. */
export const tableParamName = (urlKey: string | undefined, name: string) =>
  urlKey ? `${urlKey}_${name}` : name;

export function nextSorts(
  current: SortEntry[],
  key: string,
  maxSorts = MAX_SORT_COLUMNS,
): SortEntry[] {
  const idx = current.findIndex((s) => s.key === key);

  if (idx !== -1) {
    const entry = current[idx];
    if (entry.direction === "asc") {
      const next = [...current];
      next[idx] = { key, direction: "desc" };
      return next;
    }
    return current.filter((s) => s.key !== key);
  }

  const next = [...current, { key, direction: "asc" as const }];
  return next.length > maxSorts ? next.slice(next.length - maxSorts) : next;
}

const clampPage = (value: string | null): number => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
};

const clampPageSize = (value: string | null, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
};

/** "The user turned the sort off", as distinct from "no param, so use the
 * declared sort". Without it a table declaring `initialSorts` could never
 * be unsorted, since no param reads back as the declared sort. */
const NO_SORT = "none";

/** Module scope: it seeds `useState` and is compared on every read. */
const NO_SORTS: SortEntry[] = [];

const sameSorts = (a: SortEntry[], b: SortEntry[]): boolean =>
  a.length === b.length &&
  a.every(
    (entry, index) =>
      entry.key === b[index].key && entry.direction === b[index].direction,
  );

/** What a click extends. An untouched declared sort that already orders the
 * rows completely is dropped rather than joined, because nothing appended
 * behind a total order can reorder anything. See `initialSortsAreTotalOrder`. */
export function sortsToExtend(
  current: SortEntry[],
  key: string,
  initialSorts: SortEntry[],
  initialSortsAreTotalOrder = false,
): SortEntry[] {
  if (!initialSortsAreTotalOrder || initialSorts.length === 0) return current;

  const isUntouchedDefault = sameSorts(current, initialSorts);
  const alreadyActive = current.some((sort) => sort.key === key);

  return isUntouchedDefault && !alreadyActive ? [] : current;
}

// `key:dir,key:dir` in one param, string order being priority order. The
// declared sort is omitted, like page 1, so a shared link stays clean.
const encodeSorts = (
  sorts: SortEntry[],
  initialSorts: SortEntry[],
): string | null => {
  if (sameSorts(sorts, initialSorts)) return null;
  if (sorts.length === 0) return initialSorts.length === 0 ? null : NO_SORT;
  return sorts.map((s) => `${s.key}:${s.direction}`).join(",");
};

// Re-capped on parse, in case a pasted URL was hand-edited past the limit.
const parseSorts = (
  raw: string | null,
  initialSorts: SortEntry[],
): SortEntry[] => {
  if (raw === null) return initialSorts;
  if (raw === NO_SORT) return [];
  if (!raw) return [];
  return raw
    .split(",")
    .map((pair): SortEntry | null => {
      const [key, dir] = pair.split(":");
      if (!key || (dir !== "asc" && dir !== "desc")) return null;
      return { key, direction: dir };
    })
    .filter((s): s is SortEntry => s !== null)
    .slice(0, MAX_SORT_COLUMNS);
};

function useUrlAdapter(
  initialPageSize: number,
  urlKey: string | undefined,
  initialFilters: TableFilters,
  initialSorts: SortEntry[],
  initialSortsAreTotalOrder: boolean,
): TableControlsAdapter {
  const [searchParams, setSearchParams] = useSearchParams();

  const paramName = useCallback(
    (name: string) => tableParamName(urlKey, name),
    [urlKey],
  );

  // `{ replace: true }` on every control, so Back leaves the page rather
  // than rewinding through it a keystroke at a time. Settled on
  // #84 and not open; it supersedes #59's user story 7. Sharing is
  // unaffected, since the URL is still written on every change.
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(updates)) {
            if (value === null || value === "") {
              next.delete(key);
            } else {
              next.set(key, value);
            }
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Search draft, decoupled from the network-side debounce in
  // `useServerTableState`.
  const urlSearchQuery = searchParams.get(paramName("q")) ?? "";
  const [searchDraft, setSearchDraft] = useState(urlSearchQuery);
  const debouncedSearchDraft = useDebouncedValue(searchDraft, 400);

  // Re-sync when the URL changes from outside typing: back/forward, a
  // pasted link, a sort or page reset.
  useEffect(() => {
    if (!urlKey) return;
    setSearchDraft(urlSearchQuery);
    // Only re-sync when the URL's own value changes, not on every render —
    // deliberately excluding local draft state from the deps.
  }, [urlKey, urlSearchQuery]);

  // Commit the debounced draft to the URL once typing settles.
  useEffect(() => {
    if (!urlKey) return;
    if (debouncedSearchDraft === urlSearchQuery) return;
    updateParams({
      [paramName("q")]: debouncedSearchDraft || null,
      [paramName("page")]: null, // stale page after filtering would show an empty page
    });
  }, [debouncedSearchDraft, urlKey, urlSearchQuery, updateParams, paramName]);

  const page = clampPage(searchParams.get(paramName("page")));
  const pageSize = clampPageSize(
    searchParams.get(paramName("size")),
    initialPageSize,
  );
  const sorts = parseSorts(searchParams.get(paramName("sort")), initialSorts);

  // Derived from the URL every render, like page and sort, so a refresh and
  // a pasted link restore the same view. Only declared keys are read, so a
  // hand-edited URL can't inject a filter the endpoint would 400.
  const filters: TableFilters = {};
  for (const [key, defaultValue] of Object.entries(initialFilters)) {
    filters[key] = searchParams.get(paramName(key)) ?? defaultValue;
  }

  const onPageChange = (newPage: number) => {
    updateParams({
      [paramName("page")]: newPage > 1 ? String(newPage) : null,
    });
  };

  const onPageSizeChange = (size: number) => {
    updateParams({
      [paramName("size")]: size !== initialPageSize ? String(size) : null,
      [paramName("page")]: null,
    });
  };

  const onSearchChange = (query: string) => {
    setSearchDraft(query); // debounced effect above commits this to the URL
  };

  const onSort = (key: string) => {
    updateParams({
      [paramName("sort")]: encodeSorts(
        nextSorts(
          sortsToExtend(sorts, key, initialSorts, initialSortsAreTotalOrder),
          key,
        ),
        initialSorts,
      ),
      [paramName("page")]: null,
    });
  };

  // Recovery from a 422, so it has to mean "unsorted" outright. Falling
  // back to the declared sort would re-send the key the server just
  // rejected, if that is the one the table declared.
  const resetSort = () => {
    updateParams({ [paramName("sort")]: encodeSorts([], initialSorts) });
  };

  const setFilters = (patch: TableFilters) => {
    const updates: Record<string, string | null> = {};

    for (const [key, value] of Object.entries(
      declaredOnly(patch, initialFilters),
    )) {
      // A filter at its default is absent from the URL: `?status=all` is
      // noise, and makes an unfiltered table look filtered.
      updates[paramName(key)] = value === initialFilters[key] ? null : value;
    }

    // Reset the page: what was on page 7 of the old filter isn't there
    // under the new one, and a page past the end renders empty.
    updates[paramName("page")] = null;

    updateParams(updates);
  };

  return {
    page,
    pageSize,
    searchQuery: searchDraft,
    sorts,
    filters,
    onPageChange,
    onPageSizeChange,
    onSearchChange,
    onSort,
    resetSort,
    setFilters,
  };
}

/** Local (component) state adapter, used when no `urlKey` is provided. */
function useLocalAdapter(
  initialPageSize: number,
  initialFilters: TableFilters,
  initialSorts: SortEntry[],
  initialSortsAreTotalOrder: boolean,
): TableControlsAdapter {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchQuery, setSearchQuery] = useState("");
  const [sorts, setSorts] = useState<SortEntry[]>(initialSorts);
  const [filters, setFiltersState] = useState<TableFilters>(initialFilters);

  const onPageChange = (newPage: number) => setPage(newPage);

  const onPageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const onSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  const onSort = (key: string) => {
    setSorts((prev) =>
      nextSorts(
        sortsToExtend(prev, key, initialSorts, initialSortsAreTotalOrder),
        key,
      ),
    );
    setPage(1);
  };

  const resetSort = () => setSorts([]);

  const setFilters = (patch: TableFilters) => {
    setFiltersState((prev) => ({
      ...prev,
      ...declaredOnly(patch, initialFilters),
    }));
    setPage(1);
  };

  return {
    page,
    pageSize,
    searchQuery,
    sorts,
    filters,
    onPageChange,
    onPageSizeChange,
    onSearchChange,
    onSort,
    resetSort,
    setFilters,
  };
}

/** Picks an adapter. Both are always instantiated so hook call order stays
 * stable, and `urlKey` is checked once, at the return. */
export function useTableControls(
  initialPageSize = 25,
  urlKey?: string,
  initialFilters: TableFilters = {},
  initialSorts: SortEntry[] = NO_SORTS,
  initialSortsAreTotalOrder = false,
): TableControls {
  const urlAdapter = useUrlAdapter(
    initialPageSize,
    urlKey,
    initialFilters,
    initialSorts,
    initialSortsAreTotalOrder,
  );
  const localAdapter = useLocalAdapter(
    initialPageSize,
    initialFilters,
    initialSorts,
    initialSortsAreTotalOrder,
  );

  return urlKey ? urlAdapter : localAdapter;
}
