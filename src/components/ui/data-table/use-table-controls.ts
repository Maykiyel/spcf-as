import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { MAX_SORT_COLUMNS, type SortEntry } from "./types";

export type TableControls = {
  page: number;
  pageSize: number;
  searchQuery: string;
  sorts: SortEntry[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSearchChange: (query: string) => void;
  onSort: (key: string) => void;
  resetSort: () => void;
};

type TableControlsAdapter = TableControls;

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

// Encodes the ordered sort list as `key:dir,key:dir` in a single param —
// order in the string is the priority order, so no separate index/priority
// field is needed. Defensively re-capped on parse in case a shared/pasted
// URL was hand-edited past the current limit.
const encodeSorts = (sorts: SortEntry[]): string | null =>
  sorts.length === 0
    ? null
    : sorts.map((s) => `${s.key}:${s.direction}`).join(",");

const parseSorts = (raw: string | null): SortEntry[] => {
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
): TableControlsAdapter {
  const [searchParams, setSearchParams] = useSearchParams();

  const paramName = useCallback(
    (name: string) => (urlKey ? `${urlKey}_${name}` : name),
    [urlKey],
  );

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

  // ---- Search draft (decoupled from the network-side debounce that
  // `useServerTableState` applies independently before hitting the API) ----
  const urlSearchQuery = searchParams.get(paramName("q")) ?? "";
  const [searchDraft, setSearchDraft] = useState(urlSearchQuery);
  const debouncedSearchDraft = useDebouncedValue(searchDraft, 400);

  // Keep the draft in sync when the URL changes from outside typing —
  // back/forward navigation, a pasted/shared link, sort/page resets, etc.
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
  const sorts = parseSorts(searchParams.get(paramName("sort")));

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
      [paramName("sort")]: encodeSorts(nextSorts(sorts, key)),
      [paramName("page")]: null,
    });
  };

  const resetSort = () => {
    updateParams({ [paramName("sort")]: null });
  };

  return {
    page,
    pageSize,
    searchQuery: searchDraft,
    sorts,
    onPageChange,
    onPageSizeChange,
    onSearchChange,
    onSort,
    resetSort,
  };
}

/** Local (component) state adapter, used when no `urlKey` is provided. */
function useLocalAdapter(initialPageSize: number): TableControlsAdapter {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchQuery, setSearchQuery] = useState("");
  const [sorts, setSorts] = useState<SortEntry[]>([]);

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
    setSorts((prev) => nextSorts(prev, key));
    setPage(1);
  };

  const resetSort = () => setSorts([]);

  return {
    page,
    pageSize,
    searchQuery,
    sorts,
    onPageChange,
    onPageSizeChange,
    onSearchChange,
    onSort,
    resetSort,
  };
}

/**
 * Thin selector over one interface: both adapters are always instantiated
 * (so hook call order stays stable regardless of `urlKey`), and this just
 * picks which one's state/handlers to expose. No handler here re-checks
 * `urlKey` — that decision is made once, at the return statement.
 */
export function useTableControls(
  initialPageSize = 25,
  urlKey?: string,
): TableControls {
  const urlAdapter = useUrlAdapter(initialPageSize, urlKey);
  const localAdapter = useLocalAdapter(initialPageSize);

  return urlKey ? urlAdapter : localAdapter;
}
