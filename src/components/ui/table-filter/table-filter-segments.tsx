import { SegmentedControl } from "@mantine/core";

/** `null` is "unfiltered" and gets dropped from the request;
 * `SegmentedControl` has no null, so this bridges at the control's edge. */
const ALL = "all";

export type TableFilterOption = {
  label: string;
  value: string;
};

export type TableFilterSegmentsProps = {
  /** The current value, or `null` for unfiltered. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Names the control for assistive tech, and scopes it in tests: segment
   * labels often repeat the words in the rows they filter. */
  label: string;
  /** What the unfiltered segment reads. "All" and "All Statuses" are each
   * right in different toolbars, so the caller decides. */
  allLabel: string;
  options: TableFilterOption[];
};

/**
 * The shared segmented filter control: a value, a change, and the `null` to
 * `ALL` bridge. Domain-agnostic. Wrappers that know what a Role or an
 * `is_active` flag means belong in their feature, per this folder's rule,
 * so the wire values are named at the declaration.
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
