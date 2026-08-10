import type { SortEntry } from "./types";

export function encodeSortsForApi(sorts: SortEntry[]): string | undefined {
  if (sorts.length === 0) return undefined;
  return sorts
    .map((s) => (s.direction === "desc" ? `-${s.key}` : s.key))
    .join(",");
}
