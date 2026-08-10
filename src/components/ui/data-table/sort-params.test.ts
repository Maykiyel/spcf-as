import { describe, it, expect } from "vitest";
import { encodeSortsForApi } from "./sort-params";

describe("encodeSortsForApi", () => {
  it("returns undefined for no active sorts", () => {
    expect(encodeSortsForApi([])).toBeUndefined();
  });

  it("encodes an ascending sort as the bare key", () => {
    expect(encodeSortsForApi([{ key: "name", direction: "asc" }])).toBe(
      "name",
    );
  });

  it("encodes a descending sort with a leading dash", () => {
    expect(encodeSortsForApi([{ key: "name", direction: "desc" }])).toBe(
      "-name",
    );
  });

  it("comma-joins multiple sorts in priority order", () => {
    expect(
      encodeSortsForApi([
        { key: "name", direction: "asc" },
        { key: "price", direction: "desc" },
      ]),
    ).toBe("name,-price");
  });
});
