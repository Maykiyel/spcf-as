import { describe, it, expect } from "vitest";
import type { ColumnDef } from "./types";
import {
  allowedSorts,
  columnId,
  columnSortKey,
  isColumnSortable,
  sortableColumnIds,
  sortPlanDefault,
  sortPlanDefaultIsTotalOrder,
  unreachableSortKeys,
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
    expect(columnSortKey<Row>({ field: "name", header: "Name" })).toBe("name");
  });

  it("prefers the wire name when the two differ", () => {
    expect(
      columnSortKey<Row>({
        field: "name",
        sortKey: "full_name",
        header: "Name",
      }),
    ).toBe("full_name");
  });

  it("is undefined for a column that reads no field", () => {
    // The whole reason `field` and `id` are separate: an action column has
    // no key to sort under, so it cannot be derived into a sortable one.
    expect(
      columnSortKey<Row>({
        id: "actions",
        header: "Actions",
        render: () => null,
      }),
    ).toBeUndefined();
  });
});

describe("columnId", () => {
  it("is the field when nothing overrides it", () => {
    expect(columnId<Row>({ field: "name", header: "Name" })).toBe("name");
  });

  it("is the id when two columns read the same field", () => {
    expect(
      columnId<Row>({ field: "name", id: "nickname", header: "Nick" }),
    ).toBe("nickname");
  });
});

describe("isColumnSortable", () => {
  it("is true for an allow-listed field", () => {
    expect(isColumnSortable<Row>({ field: "name", header: "Name" }, plan)).toBe(
      true,
    );
  });

  it("is true for an allow-listed wire name the field doesn't match", () => {
    expect(
      isColumnSortable<Row>(
        { field: "name", sortKey: "id", header: "Name" },
        plan,
      ),
    ).toBe(true);
  });

  it("is false for a field the endpoint doesn't allow-list", () => {
    expect(
      isColumnSortable<Row>({ field: "total", header: "T" }, {
        allowed: ["name"],
      }),
    ).toBe(false);
  });

  it("is false for a rendered column, whatever the plan allows", () => {
    // Guards the bug derivation would otherwise have: Manage Accounts'
    // Actions column used to be keyed `full_name`, which `/users`
    // allow-lists, and would have become a sortable Actions header.
    expect(
      isColumnSortable<Row>(
        { id: "actions", header: "Actions", render: () => null },
        plan,
      ),
    ).toBe(false);
  });

  it("is false for every column when the table declares no plan", () => {
    expect(isColumnSortable<Row>({ field: "name", header: "Name" })).toBe(
      false,
    );
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
    // Order matters: a unique key ahead of another makes the rest inert, it
    // doesn't make the whole default a total order.
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
    expect(allowedSorts([{ key: "nonsense", direction: "asc" }], plan)).toEqual(
      [],
    );
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

describe("sortableColumnIds and unreachableSortKeys", () => {
  const columns: ColumnDef<Row>[] = [
    { field: "name", header: "Name" },
    { field: "total", header: "Total" },
    { id: "actions", header: "Actions", render: () => null },
  ];

  it("names the columns a header will offer a sort on, in column order", () => {
    expect(sortableColumnIds(plan, columns)).toEqual(["name", "total"]);
  });

  it("names allow-listed keys no column offers", () => {
    // Not a defect: an endpoint may allow-list more than a table shows.
    expect(unreachableSortKeys(plan, columns)).toEqual(["id"]);
  });

  it("counts a column by its wire name, not the field it reads", () => {
    const withSortKey: ColumnDef<Row>[] = [
      { field: "name", sortKey: "id", header: "Name" },
    ];
    expect(sortableColumnIds(plan, withSortKey)).toEqual(["name"]);
    expect(unreachableSortKeys(plan, withSortKey)).toEqual(["name", "total"]);
  });
});
