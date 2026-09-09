import { describe, it, expect } from "vitest";
import type { ColumnDef } from "./types";
import {
  allowedSorts,
  columnSortKey,
  sortPlanDefault,
  sortPlanDefaultIsTotalOrder,
  sortPlanViolations,
  type SortPlan,
} from "./sort-plan";

type Row = { id: number; name: string; total: number };

const plan: SortPlan = {
  allowed: ["id", "name", "total"],
  unique: ["id"],
  default: [
    { key: "name", direction: "asc" },
    { key: "id", direction: "asc" },
  ],
};

describe("columnSortKey", () => {
  it("falls back to the field the cell reads", () => {
    expect(columnSortKey<Row>({ key: "name", header: "Name" })).toBe("name");
  });

  it("prefers the wire name when the two differ", () => {
    expect(
      columnSortKey<Row>({ key: "name", sortKey: "full_name", header: "Name" }),
    ).toBe("full_name");
  });
});

describe("sortPlanDefault", () => {
  it("is empty for a table whose endpoint declares none", () => {
    expect(sortPlanDefault({ allowed: ["name"] })).toEqual([]);
    expect(sortPlanDefault()).toEqual([]);
  });

  it("copies rather than handing back the plan's own array", () => {
    // The hook holds this in state; a caller mutating it would edit the plan.
    expect(sortPlanDefault(plan)).not.toBe(plan.default);
    expect(sortPlanDefault(plan)).toEqual(plan.default);
  });
});

describe("sortPlanDefaultIsTotalOrder", () => {
  it("is true when the default ends in a unique key", () => {
    expect(sortPlanDefaultIsTotalOrder(plan)).toBe(true);
  });

  it("is false when the unique key is not last", () => {
    // Order matters: a unique key ahead of another makes the rest inert,
    // it doesn't make the whole default a total order.
    expect(
      sortPlanDefaultIsTotalOrder({
        ...plan,
        default: [
          { key: "id", direction: "asc" },
          { key: "name", direction: "asc" },
        ],
      }),
    ).toBe(false);
  });

  it("is false when nothing is declared unique, or nothing is declared", () => {
    expect(
      sortPlanDefaultIsTotalOrder({ allowed: ["name"], default: plan.default }),
    ).toBe(false);
    expect(sortPlanDefaultIsTotalOrder({ allowed: ["name"] })).toBe(false);
    expect(sortPlanDefaultIsTotalOrder()).toBe(false);
  });
});

describe("allowedSorts", () => {
  it("drops a key the endpoint would reject", () => {
    expect(
      allowedSorts([{ key: "nonsense", direction: "asc" }], plan),
    ).toEqual([]);
  });

  it("keeps allow-listed keys in the order given", () => {
    const sorts = [
      { key: "total", direction: "desc" as const },
      { key: "id", direction: "asc" as const },
    ];
    expect(allowedSorts(sorts, plan)).toEqual(sorts);
  });

  it("passes everything through for a table with no plan", () => {
    const sorts = [{ key: "whatever", direction: "asc" as const }];
    expect(allowedSorts(sorts, undefined)).toEqual(sorts);
  });
});

describe("sortPlanViolations", () => {
  const columns: ColumnDef<Row>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "total", header: "Total", sortable: true },
    { key: "id", header: "Actions" },
  ];

  it("is empty when the columns agree with the plan", () => {
    expect(sortPlanViolations(plan, columns)).toEqual([]);
  });

  it("names a sortable column the endpoint doesn't allow-list", () => {
    const violations = sortPlanViolations(plan, [
      ...columns,
      { key: "name", id: "nickname", sortKey: "nick", header: "Nick", sortable: true },
    ]);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("nickname");
    expect(violations[0]).toContain("nick");
  });

  it("ignores a column that borrows a key but isn't sortable", () => {
    // The Actions-column shape: `key` names a real field, and would look
    // sortable to anything deriving rather than reading `sortable`.
    expect(
      sortPlanViolations(plan, [{ key: "id", id: "actions", header: "Actions" }]),
    ).toEqual([]);
  });

  it("catches a default sort outside the allow-list", () => {
    const violations = sortPlanViolations(
      { allowed: ["name"], default: [{ key: "created_at", direction: "desc" }] },
      [],
    );

    expect(violations).toEqual([
      'declared default "created_at" isn\'t allow-listed',
    ]);
  });

  it("catches a unique key outside the allow-list", () => {
    const violations = sortPlanViolations(
      { allowed: ["name"], unique: ["id"] },
      [],
    );

    expect(violations).toEqual(['unique key "id" isn\'t allow-listed']);
  });
});
