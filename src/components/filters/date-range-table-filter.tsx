import { useTableDateRange } from "@/components/ui/data-table";
import { DateRangeFilter, toApiDate } from "@/components/ui/date-range";

/**
 * The `from_date`/`to_date` pair every list endpoint here takes.
 *
 * Takes no props, unlike every other control in this folder: its two keys
 * are fixed by the table's `dateRange` declaration, so there is nothing for
 * a panel to parameterise. It is not renderable without a provider.
 */
export function DateRangeTableFilter() {
  const { period, onChange } = useTableDateRange();

  return (
    <DateRangeFilter
      label="Date Range"
      // `toApiDate`, not a cast: the values are strings off the URL, and
      // this is what decides whether one is a date the API takes.
      value={{ from: toApiDate(period.from), to: toApiDate(period.to) }}
      onChange={onChange}
    />
  );
}
