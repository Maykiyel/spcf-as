import { useEffect, useState } from "react";
import { DatePickerInput } from "@mantine/dates";
import type { DatesRangeValue } from "@mantine/dates";
import { nextDateRange, type DateRangeValue } from "./date-range-value";

type DateRangeFilterProps = {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  label?: string;
  placeholder?: string;
};

/**
 * The shared date-range control. Domain-agnostic: it knows about calendar
 * dates and the API's wire format, and nothing about transactions, reports
 * or activity logs.
 *
 * Two properties it guarantees, both so that no page has to re-solve them:
 *
 * 1. **It can only emit `Y-m-d`.** `DateRangeValue` carries `ApiDate`, which
 *    `toApiDate` is the only producer of. There is no path through this
 *    component that puts another format on the wire.
 *
 * 2. **It never emits a half-picked range.** The rule is `nextDateRange`,
 *    kept pure and tested there; this component only holds the draft the
 *    calendar is showing while the rule says hold.
 */
export function DateRangeFilter({
  value,
  onChange,
  label,
  placeholder = "All dates",
}: DateRangeFilterProps) {
  const [draft, setDraft] = useState<DatesRangeValue>([value.from, value.to]);

  // Re-sync when the range changes from somewhere other than this control —
  // a restored URL, a Clear button elsewhere on the page, back/forward
  // navigation. Keyed on the committed ends only, so a half-picked draft is
  // never clobbered mid-pick: while one end is selected `value` hasn't
  // moved, and this doesn't fire.
  useEffect(() => {
    setDraft([value.from, value.to]);
  }, [value.from, value.to]);

  const handleChange = (range: DatesRangeValue) => {
    setDraft(range);

    const next = nextDateRange(range);
    if (next) onChange(next);
  };

  return (
    <DatePickerInput
      type="range"
      label={label}
      placeholder={placeholder}
      value={draft}
      onChange={handleChange}
      clearable
      w={{ base: "100%", xs: 260 }}
    />
  );
}
