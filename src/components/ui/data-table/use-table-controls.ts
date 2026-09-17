import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  startTransition,
} from "react";
import { useSearchParams } from "react-router";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { MAX_SORT_COLUMNS, type SortEntry, type TableFilters } from "./types";
import { allowedSorts, sortPlanDefault, type SortPlan } from "./sort-plan";

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
  /** Whether anything is currently narrowing the table. */
  isFiltered: boolean;
  /** Every filter back to its declared default, the search emptied, page
   * one — in one write. */
  clearFilters: () => void;
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

/** Whether anything is narrowing the table: any declared filter away from
 * the value it was declared with, or text in the search box. Reads the
 * search draft rather than the debounced value, so the control appears on
 * the first keystroke rather than 400ms later.
 *
 * Half a date range needs no special case: the missing end reads as its
 * default and the set one does not. */
export function isTableFiltered(
  filters: TableFilters,
  initialFilters: TableFilters,
  searchQuery: string,
): boolean {
  if (searchQuery !== "") return true;
  return Object.entries(initialFilters).some(
    ([key, declared]) => filters[key] !== declared,
  );
}

/** Every key a clear writes, as one record. Returning a filter to its
 * declared default is exactly what drops it from the URL, so `null` is both
 * "cleared" and "absent" and a cleared table's URL is clean by
 * construction. Sort and size are absent, so both survive. */
export function clearParamUpdates(
  initialFilters: TableFilters,
  paramName: (name: string) => string,
): Record<string, string | null> {
  const updates: Record<string, string | null> = {};
  for (const key of Object.keys(initialFilters)) {
    updates[paramName(key)] = null;
  }
  updates[paramName("q")] = null;
  updates[paramName("page")] = null;
  return updates;
}

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

/** "This table is unsorted", as distinct from "no param, so use the
 * declared sort". Reached by `resetSort` and a shared link, not by a click:
 * see `sortsAfterClick`. */
const NO_SORT = "none";

/** Module scope: it seeds `useState` and is compared on every read. */
const NO_SORTS: SortEntry[] = [];

const sameSorts = (a: SortEntry[], b: SortEntry[]): boolean =>
  a.length === b.length &&
  a.every(
    (entry, index) =>
      entry.key === b[index].key && entry.direction === b[index].direction,
  );

/** What a click extends. The first click on a still-untouched declared sort
 * replaces it rather than joining behind it: a header means "sort by this",
 * and a second column is something the user asks for by clicking twice.
 *
 * This used to happen only where the declared sort was a total order, on the
 * grounds that a key appended behind one is inert. The other half of that —
 * joining behind a default that ties — made a header's behaviour depend on
 * whether the *default's* key happened to tie, which a user cannot see. It
 * left Status on the transactions list and Username on Manage Accounts
 * lighting a caret and reordering nothing. See #126. */
export function sortsToExtend(
  current: SortEntry[],
  key: string,
  initialSorts: SortEntry[],
): SortEntry[] {
  if (initialSorts.length === 0) return current;

  const isUntouchedDefault = sameSorts(current, initialSorts);
  const alreadyActive = current.some((sort) => sort.key === key);

  return isUntouchedDefault && !alreadyActive ? [] : current;
}

/** One header click, start to finish. A click never leaves the table in an
 * order no header shows a caret for: sending no sort at all means the rows
 * arrive in whatever key the endpoint falls back to. */
export function sortsAfterClick(
  current: SortEntry[],
  key: string,
  initialSorts: SortEntry[],
): SortEntry[] {
  const base = sortsToExtend(current, key, initialSorts);
  const activeIdx = base.findIndex((sort) => sort.key === key);
  const isDeclared = initialSorts.some((sort) => sort.key === key);

  // Removing a declared column would leave no caret lit anywhere.
  if (isDeclared && activeIdx !== -1) {
    const next = [...base];
    next[activeIdx] = {
      key,
      direction: base[activeIdx].direction === "asc" ? "desc" : "asc",
    };
    return next;
  }

  const next = nextSorts(base, key);
  // Off means the declared order, not none. Measured on what the user
  // chose: a declared tiebreaker left on its own is no order a header shows.
  const chosen = next.filter(
    (sort) => !initialSorts.some((declared) => declared.key === sort.key),
  );
  return chosen.length === 0 ? initialSorts : next;
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

// Re-capped on parse, in case a pasted URL was hand-edited past the limit,
// and narrowed to what the endpoint allow-lists, so a hand-edited key can't
// reach the wire at all.
const parseSorts = (
  raw: string | null,
  initialSorts: SortEntry[],
  plan: SortPlan | undefined,
): SortEntry[] => {
  if (raw === null) return initialSorts;
  if (raw === NO_SORT) return [];
  if (!raw) return [];
  return allowedSorts(
    raw
      .split(",")
      .map((pair): SortEntry | null => {
        const [key, dir] = pair.split(":");
        if (!key || (dir !== "asc" && dir !== "desc")) return null;
        return { key, direction: dir };
      })
      .filter((s): s is SortEntry => s !== null)
      .slice(0, MAX_SORT_COLUMNS),
    plan,
  );
};

function useUrlAdapter(
  initialPageSize: number,
  urlKey: string | undefined,
  initialFilters: TableFilters,
  initialSorts: SortEntry[],
  sortPlan: SortPlan | undefined,
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
    // `setSearchParams` changes identity on every location change, so this
    // re-runs on someone else's write too — including a clear, which moves
    // the draft 400ms before the debounce catches up. Publishing then would
    // put the old query straight back.
    if (debouncedSearchDraft !== searchDraft) return;
    if (debouncedSearchDraft === urlSearchQuery) return;
    updateParams({
      [paramName("q")]: debouncedSearchDraft || null,
      [paramName("page")]: null, // stale page after filtering would show an empty page
    });
  }, [
    debouncedSearchDraft,
    searchDraft,
    urlKey,
    urlSearchQuery,
    updateParams,
    paramName,
  ]);

  const page = clampPage(searchParams.get(paramName("page")));
  const pageSize = clampPageSize(
    searchParams.get(paramName("size")),
    initialPageSize,
  );
  const sorts = parseSorts(
    searchParams.get(paramName("sort")),
    initialSorts,
    sortPlan,
  );

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
        sortsAfterClick(sorts, key, initialSorts),
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

  // The draft is reset here rather than left to the debounce: emptying only
  // the draft would leave the old query in force for 400ms and then fire a
  // second refetch.
  //
  // Both in one transition because React Router commits a navigation in one
  // of its own. A plain state update beside it lands a render earlier, and a
  // table carrying both a filter and a search then fetches twice — once for
  // the emptied search still holding the old filter, once for the rest.
  const clearFilters = () => {
    startTransition(() => {
      setSearchDraft("");
      updateParams(clearParamUpdates(initialFilters, paramName));
    });
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
    isFiltered: isTableFiltered(filters, initialFilters, searchDraft),
    clearFilters,
  };
}

/** Local (component) state adapter, used when no `urlKey` is provided. */
function useLocalAdapter(
  initialPageSize: number,
  initialFilters: TableFilters,
  initialSorts: SortEntry[],
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
    setSorts((prev) => sortsAfterClick(prev, key, initialSorts));
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

  const clearFilters = () => {
    setFiltersState(initialFilters);
    setSearchQuery("");
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
    isFiltered: isTableFiltered(filters, initialFilters, searchQuery),
    clearFilters,
  };
}

/** Picks an adapter. Both are always instantiated so hook call order stays
 * stable, and `urlKey` is checked once, at the return. */
export function useTableControls(
  initialPageSize = 25,
  urlKey?: string,
  initialFilters: TableFilters = {},
  sortPlan?: SortPlan,
): TableControls {
  // Both derived from the plan rather than declared beside it, so a table
  // cannot state a default the endpoint rejects or claim a total order its
  // default doesn't have. Memoised on the plan, which is module scope at
  // every call site.
  const initialSorts = useMemo(
    () => (sortPlan ? sortPlanDefault(sortPlan) : NO_SORTS),
    [sortPlan],
  );

  const urlAdapter = useUrlAdapter(
    initialPageSize,
    urlKey,
    initialFilters,
    initialSorts,
    sortPlan,
  );
  const localAdapter = useLocalAdapter(
    initialPageSize,
    initialFilters,
    initialSorts,
  );

  return urlKey ? urlAdapter : localAdapter;
}
