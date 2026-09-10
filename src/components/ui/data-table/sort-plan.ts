import type { ColumnDef, SortEntry } from "./types";

/**
 * One endpoint's sort surface, declared once beside the fetcher that owns
 * it. A key outside `allowed` is a 400 or a 422 on the first header click,
 * so this is the fact `BACKEND_NOTES.md` records per endpoint, and which
 * the columns, the declared default and the total-order claim each used to
 * restate separately.
 */
export type SortPlan = {
  allowed: readonly string[];
  /** The endpoint's own default, declared so the header carries a caret
   * over rows that are plainly ordered. Any `sort` param suppresses the
   * server's default outright rather than adding to it, so a declared
   * default has to carry its own tiebreaker. */
  default?: readonly SortEntry[];
};

/** The wire name a column sorts under, or `undefined` for a column that
 * reads no field and names no sort — an action or a badge, which is exactly
 * what must never become sortable by accident. */
export const columnSortKey = <T>(column: ColumnDef<T>): string | undefined =>
  column.sortKey ?? column.field;

/** A column's identity, for a React key and for naming it in a test. */
export const columnId = <T>(column: ColumnDef<T>): string =>
  column.id ?? (column.field as string);

/** Sortability is derived, never declared: the endpoint's allow-list is the
 * only thing that decides, so a column cannot claim a sort the wire rejects
 * and cannot miss one it offers. */
export const isColumnSortable = <T>(
  column: ColumnDef<T>,
  plan?: SortPlan,
): boolean => {
  const key = columnSortKey(column);
  return Boolean(plan && key && plan.allowed.includes(key));
};

export const sortPlanDefault = (plan?: SortPlan): SortEntry[] =>
  plan?.default ? [...plan.default] : [];

/** Drops what the endpoint would reject. A header only ever offers an
 * allow-listed key, so a restored or hand-edited URL is the only way an
 * unknown one gets this far — the same reason `declaredOnly` exists for
 * filters. */
export const allowedSorts = (
  sorts: SortEntry[],
  plan?: SortPlan,
): SortEntry[] =>
  plan ? sorts.filter((sort) => plan.allowed.includes(sort.key)) : sorts;

/** The columns a table actually offers a sort on, by identity, in column
 * order. What a header shows a caret over. */
export const sortableColumnIds = <T>(
  plan: SortPlan,
  columns: ColumnDef<T>[],
): string[] =>
  columns.filter((column) => isColumnSortable(column, plan)).map(columnId);

/** Allow-listed keys this table offers no header for. Never empty by
 * definition — an endpoint may allow-list more than a table shows, as
 * `/users` does with `first_name` and `last_name` — so a test names the
 * ones it expects rather than requiring none. */
export const unreachableSortKeys = <T>(
  plan: SortPlan,
  columns: ColumnDef<T>[],
): string[] => {
  const offered = new Set(
    columns.map(columnSortKey).filter((key): key is string => Boolean(key)),
  );
  return plan.allowed.filter((key) => !offered.has(key));
};
