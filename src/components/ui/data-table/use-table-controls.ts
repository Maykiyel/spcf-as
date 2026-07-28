import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { SortDirection } from "./types";

export type TableControls = {
  page: number;
  pageSize: number;
  searchQuery: string;
  sortKey: string | null;
  sortDirection: SortDirection;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSearchChange: (query: string) => void;
  onSort: (key: string) => void;
  resetSort: () => void;
};

type TableControlsAdapter = TableControls;

const clampPage = (value: string | null): number => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
};

const clampPageSize = (value: string | null, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
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
  }, [debouncedSearchDraft, urlKey]);

  const page = clampPage(searchParams.get(paramName("page")));
  const pageSize = clampPageSize(
    searchParams.get(paramName("size")),
    initialPageSize,
  );
  const sortKey = searchParams.get(paramName("sort"));
  const sortDirection =
    (searchParams.get(paramName("dir")) as SortDirection) ?? null;

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
    let nextKey: string | null = key;
    let nextDir: SortDirection = "asc";
    if (sortKey === key) {
      if (sortDirection === "asc") {
        nextDir = "desc";
      } else {
        nextKey = null;
        nextDir = null;
      }
    }
    updateParams({
      [paramName("sort")]: nextKey,
      [paramName("dir")]: nextDir,
      [paramName("page")]: null,
    });
  };

  const resetSort = () => {
    updateParams({ [paramName("sort")]: null, [paramName("dir")]: null });
  };

  return {
    page,
    pageSize,
    searchQuery: searchDraft,
    sortKey,
    sortDirection,
    onPageChange,
    onPageSizeChange,
    onSearchChange,
    onSort,
    resetSort,
  };
}

type SortState = { key: string | null; direction: SortDirection };

/** Local (component) state adapter, used when no `urlKey` is provided. */
function useLocalAdapter(initialPageSize: number): TableControlsAdapter {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortState>({ key: null, direction: null });

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
    // Key and direction are read and written together so a rapid double
    // click can't read a stale direction against a fresh key (or vice versa).
    setSort((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return { key: null, direction: null };
    });
    setPage(1);
  };

  const resetSort = () => setSort({ key: null, direction: null });

  return {
    page,
    pageSize,
    searchQuery,
    sortKey: sort.key,
    sortDirection: sort.direction,
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
