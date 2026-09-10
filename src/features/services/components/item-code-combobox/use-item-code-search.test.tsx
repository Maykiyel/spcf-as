// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createQueryWrapper } from "@/test/render";
import { searchItemCodes } from "@/api/item-codes";
import { useItemCodeSearch } from "./use-item-code-search";

vi.mock("@/api/item-codes");
const mockSearchItemCodes = vi.mocked(searchItemCodes);

// Seam: the hook's own interface — what the field shows, and separately
// what reaches the endpoint. Those were one value until #128, which is how
// a selection ended up filtering the list down to itself.

const ALL = [
  { id: 1, name: "ALUMNI", description: null },
  { id: 2, name: "RENTAL", description: null },
];

function render(selectedName = "") {
  return renderHook(({ name }) => useItemCodeSearch(name), {
    wrapper: createQueryWrapper(),
    initialProps: { name: selectedName },
  });
}

/** The last search string the endpoint was asked for. */
function lastQuery() {
  const calls = mockSearchItemCodes.mock.calls;
  return calls.length === 0 ? undefined : calls[calls.length - 1][0];
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchItemCodes.mockResolvedValue(ALL);
});

describe("useItemCodeSearch", () => {
  it("shows the selection without querying for it", async () => {
    const { result } = render("RENTAL");

    expect(result.current.search).toBe("RENTAL");
    // The bug: sending "RENTAL" here returns only RENTAL, so the dropdown
    // offers the one option already chosen and reads as "nothing else".
    await waitFor(() => expect(lastQuery()).toBe(""));
    expect(result.current.hasTyped).toBe(false);
  });

  it("queries what the user types", async () => {
    const { result } = render("RENTAL");
    act(() => result.current.setSearch("ALU"));

    expect(result.current.search).toBe("ALU");
    expect(result.current.hasTyped).toBe(true);
    await waitFor(() => expect(lastQuery()).toBe("ALU"));
  });

  it("goes back to the selection, and back to the unfiltered list, on submit", async () => {
    const { result } = render("RENTAL");
    act(() => result.current.setSearch("ALU"));
    await waitFor(() => expect(lastQuery()).toBe("ALU"));

    act(() => result.current.showSelection());

    expect(result.current.search).toBe("RENTAL");
    expect(result.current.hasTyped).toBe(false);
    await waitFor(() => expect(lastQuery()).toBe(""));
  });

  it("drops a half-typed query when the selection changes from outside", async () => {
    // Clicking Edit on a different row. What was typed belonged to the
    // previous one.
    const { result, rerender } = render("RENTAL");
    act(() => result.current.setSearch("ALU"));
    expect(result.current.search).toBe("ALU");

    rerender({ name: "GRADUATION FEE" });

    expect(result.current.search).toBe("GRADUATION FEE");
    expect(result.current.hasTyped).toBe(false);
  });

  it("treats a cleared field as a real empty query, not as showing the selection", async () => {
    const { result } = render("RENTAL");
    act(() => result.current.setSearch(""));

    expect(result.current.search).toBe("");
    // Distinct from the untouched case above: the user asked for everything
    // rather than the field merely displaying what is set.
    expect(result.current.hasTyped).toBe(true);
    await waitFor(() => expect(lastQuery()).toBe(""));
  });
});
