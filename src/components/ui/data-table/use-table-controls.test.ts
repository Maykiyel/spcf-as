import { describe, it, expect } from "vitest";
import { nextSorts } from "./use-table-controls";

describe("nextSorts", () => {
  it("adds a new column as ascending", () => {
    expect(nextSorts([], "name")).toEqual([{ key: "name", direction: "asc" }]);
  });

  it("cycles a column asc -> desc", () => {
    const sorts = [{ key: "name", direction: "asc" as const }];
    expect(nextSorts(sorts, "name")).toEqual([
      { key: "name", direction: "desc" },
    ]);
  });

  it("cycles a column desc -> removed", () => {
    const sorts = [{ key: "name", direction: "desc" as const }];
    expect(nextSorts(sorts, "name")).toEqual([]);
  });

  it("appends a second column as secondary", () => {
    const sorts = [{ key: "name", direction: "asc" as const }];
    expect(nextSorts(sorts, "price")).toEqual([
      { key: "name", direction: "asc" },
      { key: "price", direction: "asc" },
    ]);
  });

  it("evicts the oldest (primary) on a 3rd distinct column", () => {
    const sorts = [
      { key: "name", direction: "asc" as const },
      { key: "price", direction: "asc" as const },
    ];
    expect(nextSorts(sorts, "item_code")).toEqual([
      { key: "price", direction: "asc" },
      { key: "item_code", direction: "asc" },
    ]);
  });

  it("never exceeds maxSorts regardless of how many distinct columns are clicked", () => {
    let sorts: { key: string; direction: "asc" | "desc" }[] = [];
    for (const key of ["a", "b", "c", "d", "e"]) {
      sorts = nextSorts(sorts, key);
    }
    expect(sorts.length).toBeLessThanOrEqual(2);
  });
});
