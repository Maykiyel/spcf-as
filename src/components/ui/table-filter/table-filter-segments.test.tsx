// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { fireEvent, within } from "@testing-library/react";
import { render, screen } from "@/test/render";
import { TableFilterSegments } from "./table-filter-segments";

// Seam: the component's own interface — what it shows for a given value and
// what it reports on a click. The `null` <-> "all" bridge is the reason this
// is shared rather than written per feature, so it is what these assert;
// the feature wrappers' own tests cover the wire values they choose.

// jsdom implements no ResizeObserver; Mantine's ScrollArea subscribes
// to one on mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

const OPTIONS = [
  { label: "Active", value: "1" },
  { label: "Inactive", value: "0" },
];

function renderControl(value: string | null, onChange = vi.fn()) {
  render(
    <TableFilterSegments
      label="Status"
      allLabel="All Statuses"
      options={OPTIONS}
      value={value}
      onChange={onChange}
    />,
  );
  return onChange;
}

describe("TableFilterSegments", () => {
  it("offers the unfiltered segment ahead of the options", () => {
    renderControl(null);
    const control = screen.getByLabelText("Status");

    expect(within(control).getByText("All Statuses")).toBeInTheDocument();
    expect(within(control).getByText("Active")).toBeInTheDocument();
    expect(within(control).getByText("Inactive")).toBeInTheDocument();
  });

  it("shows an unfiltered table as 'all', not as blank", () => {
    renderControl(null);

    // A SegmentedControl has no null. Rendering one as an empty selection
    // is the failure this bridge exists to prevent.
    expect(screen.getByRole("radio", { name: "All Statuses" })).toBeChecked();
  });

  it("shows the current value as the selected segment", () => {
    renderControl("0");

    expect(screen.getByRole("radio", { name: "Inactive" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "All Statuses" })).not.toBeChecked();
  });

  it("reports an option's own value when it is chosen", () => {
    const onChange = renderControl(null);

    fireEvent.click(screen.getByText("Active"));

    expect(onChange).toHaveBeenCalledExactlyOnceWith("1");
  });

  it("reports null when the unfiltered segment is chosen", () => {
    const onChange = renderControl("1");

    fireEvent.click(screen.getByText("All Statuses"));

    // Null, never the string "all". `useServerTableState` drops null from
    // the request; "all" would reach an endpoint that has no such value.
    expect(onChange).toHaveBeenCalledExactlyOnceWith(null);
  });

  it("names the control, so it can be told apart from the rows it filters", () => {
    renderControl(null);

    // Segment labels are routinely the same words as the status badges in
    // the table below, so the control needs its own name.
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
  });
});
