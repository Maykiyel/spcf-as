import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { SortDirection } from "./types";

type SortState = {
  key: string | null;
  direction: SortDirection;
};

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

const clampPage = (value: string | null): number => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
};

const clampPageSize = (value: string | null, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
};

export function useTableControls(
  initialPageSize = 25,
  urlKey?: string,
): TableControls {
  const [searchParams, setSearchParams] = useSearchParams();

  const paramName = useCallback(
    (name: string) => (urlKey ? `${urlKey}_${name}` : name),
    [urlKey],
  );

  // ---- Local fallback state, used only when `urlKey` is omitted ----
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(initialPageSize);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [localSort, setLocalSort] = useState<SortState>({
    key: null,
    direction: null,
  });

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

  // ---- Search draft (see debounce note above) ----
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

  const page = urlKey
    ? clampPage(searchParams.get(paramName("page")))
    : localPage;
  const pageSize = urlKey
    ? clampPageSize(searchParams.get(paramName("size")), initialPageSize)
    : localPageSize;
  const searchQuery = urlKey ? searchDraft : localSearchQuery;
  const sortKey = urlKey ? searchParams.get(paramName("sort")) : localSort.key;
  const sortDirection = urlKey
    ? ((searchParams.get(paramName("dir")) as SortDirection) ?? null)
    : localSort.direction;

  const onPageChange = (newPage: number) => {
    if (urlKey) {
      // Omit the param entirely at the default (page 1) to keep shareable
      // URLs clean when nothing's actually been filtered/paged.
      updateParams({
        [paramName("page")]: newPage > 1 ? String(newPage) : null,
      });
    } else {
      setLocalPage(newPage);
    }
  };

  const onPageSizeChange = (size: number) => {
    if (urlKey) {
      updateParams({
        [paramName("size")]: size !== initialPageSize ? String(size) : null,
        [paramName("page")]: null,
      });
    } else {
      setLocalPageSize(size);
      setLocalPage(1);
    }
  };

  const onSearchChange = (query: string) => {
    if (urlKey) {
      setSearchDraft(query); // debounced effect above commits this to the URL
    } else {
      setLocalSearchQuery(query);
      setLocalPage(1);
    }
  };

  const onSort = (key: string) => {
    if (urlKey) {
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
    } else {
      setLocalSort((prev) => {
        if (prev.key !== key) return { key, direction: "asc" };
        if (prev.direction === "asc") return { key, direction: "desc" };
        return { key: null, direction: null };
      });
      setLocalPage(1);
    }
  };

  const resetSort = () => {
    if (urlKey) {
      updateParams({ [paramName("sort")]: null, [paramName("dir")]: null });
    } else {
      setLocalSort({ key: null, direction: null });
    }
  };

  return {
    page,
    pageSize,
    searchQuery,
    sortKey,
    sortDirection,
    onPageChange,
    onPageSizeChange,
    onSearchChange,
    onSort,
    resetSort,
  };
}
