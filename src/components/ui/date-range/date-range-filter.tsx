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
 * The shared date-range control, domain-agnostic. It guarantees two things
 * so no page re-solves them: it can only emit `Y-m-d` (`ApiDate` has one
 * producer), and it never emits a half-picked range (the rule is
 * `nextDateRange`, kept pure and tested there).
 */
export function DateRangeFilter({
  value,
  onChange,
  label,
  placeholder = "All dates",
}: DateRangeFilterProps) {
  const [draft, setDraft] = useState<DatesRangeValue>([value.from, value.to]);

  // Re-sync when the range changes elsewhere: a restored URL, a Clear, or
  // back/forward. Keyed on the committed ends, so a half-picked draft is
  // never clobbered mid-pick.
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
