// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent } from "@testing-library/react";
import { render, screen } from "@/test/render";
import { TableFilterText } from "./table-filter-text";

// Seam: the component's own interface. It asserts the two things this
// control owns, the `null` <-> "" bridge and the debounce, and both fail
// silently: publishing `""` looks identical on screen and 400s at the
// endpoint, and publishing per keystroke looks identical too.

const DEBOUNCE_MS = 400;

/** Past the debounce, wrapped so React flushes the effects. A fixed
 * advance, not `waitFor`, which returns on its first success and so would
 * pass a negative assertion against a control with no debounce. */
const settle = () =>
  act(() => {
    vi.advanceTimersByTime(DEBOUNCE_MS + 1);
  });

function renderControl(value: string | null, onChange = vi.fn()) {
  const view = render(
    <TableFilterText label="Payer Name" value={value} onChange={onChange} />,
  );

  const rerender = (next: string | null) =>
    view.rerender(
      <TableFilterText label="Payer Name" value={next} onChange={onChange} />,
    );

  return { onChange, rerender };
}

const field = () => screen.getByLabelText("Payer Name") as HTMLInputElement;
const type = (text: string) =>
  fireEvent.change(field(), { target: { value: text } });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("TableFilterText", () => {
  it("shows an unfiltered control as empty rather than as the word null", () => {
    renderControl(null);

    expect(field().value).toBe("");
  });

  it("shows the current value when there is one", () => {
    renderControl("santos");

    expect(field().value).toBe("santos");
  });

  it("publishes what was typed once typing settles", () => {
    const { onChange } = renderControl(null);

    type("santos");
    settle();

    expect(onChange).toHaveBeenCalledExactlyOnceWith("santos");
  });

  it("publishes nothing until the typing settles", () => {
    const { onChange } = renderControl(null);

    type("san");
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS - 1);
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("publishes once for a word, not once per keystroke", () => {
    // The whole point of the debounce: without it this is five requests
    // for `s`, `sa`, `san`, `sant`, `santo` on the way to the one that
    // was wanted.
    const { onChange } = renderControl(null);

    for (const prefix of ["s", "sa", "san", "sant", "santo", "santos"]) {
      type(prefix);
      act(() => {
        vi.advanceTimersByTime(50);
      });
    }
    settle();

    expect(onChange).toHaveBeenCalledExactlyOnceWith("santos");
  });

  it("publishes null when the field is emptied, not an empty string", () => {
    // `null` is what `useServerTableState` drops from the request. An
    // empty `filter[customer]` is a 400 here, not an ignored parameter.
    const { onChange } = renderControl("santos");

    type("");
    settle();

    expect(onChange).toHaveBeenCalledExactlyOnceWith(null);
  });

  it("treats whitespace alone as clearing the filter", () => {
    const { onChange } = renderControl("santos");

    type("   ");
    settle();

    expect(onChange).toHaveBeenCalledExactlyOnceWith(null);
  });

  it("publishes nothing at all while the filter stays unset", () => {
    // Whitespace typed into an already-unfiltered control normalizes to
    // the value it already has, so there is nothing to publish — and a
    // control that published anyway would refetch the table for a space
    // bar. Also the mount case: no request fires just for rendering.
    const { onChange } = renderControl(null);

    type("   ");
    settle();

    expect(onChange).not.toHaveBeenCalled();
  });

  it("trims what it publishes", () => {
    // Every text filter this API offers is a partial match, so a trailing
    // space narrows the result rather than being ignored.
    const { onChange } = renderControl(null);

    type("  santos  ");
    settle();

    expect(onChange).toHaveBeenCalledExactlyOnceWith("santos");
  });

  it("doesn't republish a value handed back to it", () => {
    const { onChange, rerender } = renderControl(null);

    type("santos");
    settle();
    rerender("santos"); // the round trip this control just started
    settle();

    expect(onChange).toHaveBeenCalledOnce();
  });

  it("takes a value changed from outside the control", () => {
    // A restored URL, back/forward navigation, a Clear elsewhere on the
    // page — none of which go through this input.
    const { rerender } = renderControl("santos");

    rerender("cruz");

    expect(field().value).toBe("cruz");
  });

  it("keeps a half-typed draft when its own value comes back", () => {
    // The draft and the published value differ by a trailing space here,
    // so a control that re-synced unconditionally would delete a character
    // the user had just typed, mid-word.
    const { rerender } = renderControl(null);

    type("santos");
    settle();
    type("santos "); // still typing: "santos jr"
    rerender("santos"); // ...and the first word arrives back

    expect(field().value).toBe("santos ");
  });
});
