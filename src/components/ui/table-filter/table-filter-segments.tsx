import { SegmentedControl } from "@mantine/core";

/** `null` is "unfiltered", and is what `useServerTableState` drops from the
 * request rather than sending empty. `SegmentedControl` has no null, so
 * this stands in for it at the control's edge and nowhere else. */
const ALL = "all";

export type TableFilterOption = {
  label: string;
  value: string;
};

export type TableFilterSegmentsProps = {
  /** The current value, or `null` for unfiltered. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Names the control for assistive tech, and scopes it in tests — the
   * segment labels are often the same words as the values they filter on,
   * so "Active" alone does not identify this rather than a row. */
  label: string;
  /** What the unfiltered segment reads. Left to the caller because "All"
   * and "All Statuses" are both right in different toolbars, depending on
   * how many filters sit side by side. */
  allLabel: string;
  options: TableFilterOption[];
};

/**
 * The shared segmented filter control. Domain-agnostic: it knows that a
 * table filter is a string or `null` and that a segmented control cannot
 * hold `null`, and nothing about roles, statuses, accounts or services.
 *
 * It is the shape #59 settled on — takes a value, reports a change, knows
 * nothing about the URL — with the one piece worth sharing factored out:
 * the `null` ↔ `ALL` bridge, which is the part a second implementation
 * would get subtly wrong, by sending `"all"` to an endpoint that has no
 * such value or by rendering an unfiltered control as blank.
 *
 * **Domain-specific wrappers stay in their feature.** Per this folder's own
 * rule, a control that knows what a Role or an `is_active` flag means
 * belongs in `features/<feature>/components/`, and both of this component's
 * consumers are exactly that: they name their filter, its options and the
 * wire values those options carry, and hand the rest here. Composing a
 * bare `TableFilterSegments` in a toolbar is not wrong, but naming the
 * filter at its declaration is what puts the wire-value decision somewhere
 * a reader can find it.
 */
export function TableFilterSegments({
  value,
  onChange,
  label,
  allLabel,
  options,
}: TableFilterSegmentsProps) {
  return (
    <SegmentedControl
      size="xs"
      aria-label={label}
      value={value ?? ALL}
      onChange={(next) => onChange(next === ALL ? null : next)}
      data={[{ label: allLabel, value: ALL }, ...options]}
    />
  );
}
