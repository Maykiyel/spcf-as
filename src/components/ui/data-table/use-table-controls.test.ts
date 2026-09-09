import { describe, it, expect } from "vitest";
import {
  nextSorts,
  sortsAfterClick,
  sortsToExtend,
} from "./use-table-controls";

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

const asc = (key: string) => ({ key, direction: "asc" as const });
const desc = (key: string) => ({ key, direction: "desc" as const });

describe("sortsToExtend", () => {
  it("drops an untouched total-order declared sort when another column is clicked", () => {
    // The reason it exists: `service_name` is unique, so a key appended
    // behind it is inert and clicking Revenue would reorder nothing.
    const declared = [asc("service_name")];
    expect(sortsToExtend(declared, "subtotal", declared, true)).toEqual([]);
    expect(
      nextSorts(sortsToExtend(declared, "subtotal", declared, true), "subtotal"),
    ).toEqual([asc("subtotal")]);
  });

  it("drops both halves of a two-key declared sort", () => {
    const declared = [desc("created_at"), asc("id")];
    expect(sortsToExtend(declared, "cashier_name", declared, true)).toEqual([]);
  });

  it("joins a declared sort that is not a total order", () => {
    // The Dashboard's earnings table: `total_earnings` ties freely, so a
    // name click genuinely breaks those ties rather than being inert.
    const declared = [desc("total_earnings")];
    expect(sortsToExtend(declared, "cashier_name", declared)).toEqual(declared);
    expect(nextSorts(declared, "cashier_name")).toEqual([
      desc("total_earnings"),
      asc("cashier_name"),
    ]);
  });

  it("keeps the declared sort when the clicked column is the declared one", () => {
    // What it extends is unaffected. Where the cycle then lands is
    // `sortsAfterClick`'s, not this function's.
    const declared = [asc("service_name")];
    expect(sortsToExtend(declared, "service_name", declared, true)).toEqual(
      declared,
    );
    expect(nextSorts(declared, "service_name")).toEqual([desc("service_name")]);
  });

  it("keeps a selection the user has already changed, so a second column joins", () => {
    const declared = [asc("service_name")];
    const chosen = [asc("subtotal")];
    expect(sortsToExtend(chosen, "total_quantity", declared, true)).toEqual(
      chosen,
    );
    expect(nextSorts(chosen, "total_quantity")).toEqual([
      asc("subtotal"),
      asc("total_quantity"),
    ]);
  });

  it("leaves a table that declares no sort alone", () => {
    expect(sortsToExtend([], "name", [], true)).toEqual([]);
    expect(sortsToExtend([asc("name")], "price", [], true)).toEqual([
      asc("name"),
    ]);
  });

  it("keeps an unsorted table unsorted rather than treating it as the default", () => {
    // `sort=none` is a user choice, not the declared state, so a click
    // from there behaves normally.
    const declared = [asc("service_name")];
    expect(sortsToExtend([], "subtotal", declared, true)).toEqual([]);
  });
});

describe("sortsAfterClick", () => {
  it("makes the declared column a two-state header", () => {
    // The defect this exists for: a third click sent no sort at all, and
    // the endpoint answered in `service_id` order under a lit-up nothing.
    const declared = [asc("service_name")];
    const flipped = sortsAfterClick(declared, "service_name", declared, true);
    expect(flipped).toEqual([desc("service_name")]);
    expect(sortsAfterClick(flipped, "service_name", declared, true)).toEqual(
      declared,
    );
  });

  it("flips a declared descending column to ascending rather than off", () => {
    const declared = [desc("total_earnings")];
    expect(sortsAfterClick(declared, "total_earnings", declared)).toEqual([
      asc("total_earnings"),
    ]);
  });

  it("keeps a declared tiebreaker when the column ahead of it flips", () => {
    // Dropping `id` here would page a tied `created_at` unstably.
    const declared = [desc("created_at"), asc("id")];
    expect(sortsAfterClick(declared, "created_at", declared, true)).toEqual([
      asc("created_at"),
      asc("id"),
    ]);
  });

  it("lands any other column's third click on the declared sort", () => {
    const declared = [asc("service_name")];
    expect(
      sortsAfterClick([desc("subtotal")], "subtotal", declared, true),
    ).toEqual(declared);
  });

  it("still reaches unsorted on a table that declares no sort", () => {
    // There it is the order the table opened in, so a caret is not owed.
    expect(sortsAfterClick([desc("name")], "name", [])).toEqual([]);
  });

  it("adds a declared column back from unsorted like any other", () => {
    const declared = [asc("service_name")];
    expect(sortsAfterClick([], "service_name", declared, true)).toEqual(
      declared,
    );
  });
});
