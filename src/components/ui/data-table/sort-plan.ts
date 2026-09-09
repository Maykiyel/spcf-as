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
  /** Which allow-listed keys are unique per row. A default ending in one
   * orders the rows completely, so the first click on another header
   * replaces it rather than joining behind it. */
  unique?: readonly string[];
  /** The endpoint's own default, declared so the header carries a caret
   * over rows that are plainly ordered. Any `sort` param suppresses the
   * server's default outright rather than adding to it, so a declared
   * default has to carry its own tiebreaker. */
  default?: readonly SortEntry[];
};

/** The wire name a column sorts under. `key` also names the field the cell
 * reads, so a column sorted under another name says so with `sortKey`. */
export const columnSortKey = <T>(column: ColumnDef<T>): string =>
  column.sortKey ?? column.key;

export const sortPlanDefault = (plan?: SortPlan): SortEntry[] =>
  plan?.default ? [...plan.default] : [];

export const sortPlanDefaultIsTotalOrder = (plan?: SortPlan): boolean => {
  const last = plan?.default?.[plan.default.length - 1];
  return Boolean(last && plan?.unique?.includes(last.key));
};

/** Drops what the endpoint would reject. A header only ever offers an
 * allow-listed key, so a restored or hand-edited URL is the only way an
 * unknown one gets this far — the same reason `declaredOnly` exists for
 * filters. */
export const allowedSorts = (
  sorts: SortEntry[],
  plan?: SortPlan,
): SortEntry[] =>
  plan ? sorts.filter((sort) => plan.allowed.includes(sort.key)) : sorts;

/**
 * Every way a table's columns can disagree with its endpoint's plan, as
 * readable lines. Empty means they agree.
 *
 * For tests, not for the app: both sides are static data, so checking them
 * needs no rendering, no fetcher and no header click.
 */
export function sortPlanViolations<T>(
  plan: SortPlan,
  columns: ColumnDef<T>[],
): string[] {
  const violations: string[] = [];

  for (const column of columns) {
    if (!column.sortable) continue;

    const key = columnSortKey(column);
    if (!plan.allowed.includes(key)) {
      violations.push(
        `column "${column.id ?? column.key}" sorts as "${key}", which this endpoint doesn't allow-list`,
      );
    }
  }

  for (const entry of plan.default ?? []) {
    if (!plan.allowed.includes(entry.key)) {
      violations.push(`declared default "${entry.key}" isn't allow-listed`);
    }
  }

  for (const key of plan.unique ?? []) {
    if (!plan.allowed.includes(key)) {
      violations.push(`unique key "${key}" isn't allow-listed`);
    }
  }

  return violations;
}
