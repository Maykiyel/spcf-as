import { useEffect, useState } from "react";
import { useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
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

  const theme = useMantineTheme();
  // Below the width shape's own `xs` boundary, a floating popover has too
  // little room either side of the calendar; a modal guarantees it fits.
  const isCompact = useMediaQuery(
    `(max-width: ${theme.breakpoints.xs})`,
    false,
    { getInitialValueInEffect: false },
  );

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
      // Short month, like `formatDateTime` renders every other date here.
      // Mantine's default spells it out, which wrapped a full range onto a
      // second line and shifted everything under it. Width to match.
      valueFormat="MMM D, YYYY"
      w={{ base: "100%", xs: 300 }}
      dropdownType={isCompact ? "modal" : "popover"}
    />
  );
}
