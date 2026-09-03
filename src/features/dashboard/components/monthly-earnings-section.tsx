import { Suspense, lazy, useState } from "react";
import { Select, Skeleton, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { getMonthlyEarnings } from "../api/get-monthly-earnings";
import type { MonthlyEarnings } from "../types";
import type { MonthlyEarningsPoint } from "./monthly-earnings-chart";

// Split per role, not per route. See the chart module for why.
const MonthlyEarningsChart = lazy(() => import("./monthly-earnings-chart"));

/** The endpoint validates `year` as `min:2026, max: next year`. Both ends
 * are the server's, restated here only so the control cannot offer a year
 * it would answer with a 422. */
const EARLIEST_YEAR = 2026;

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function selectableYears(currentYear: number): number[] {
  const years: number[] = [];
  for (let year = EARLIEST_YEAR; year <= currentYear + 1; year += 1) {
    years.push(year);
  }
  return years;
}

/** `2026-03` to `Mar`, by index rather than by parsing a date.
 *
 * `new Date("2026-03")` is parsed as UTC midnight and then read back in
 * local time, which in UTC+8 is fine but in a negative offset would name
 * the month before. The application already has one UTC-boundary problem
 * it cannot fix from here; it does not need a second one it can avoid. */
function toChartPoint(entry: MonthlyEarnings): MonthlyEarningsPoint {
  const monthNumber = Number(entry.month.split("-")[1]);
  return {
    month: MONTH_LABELS[monthNumber - 1] ?? entry.month,
    total_earnings: entry.total_earnings,
  };
}

/**
 * Earnings by month for a chosen year, admin-only.
 *
 * Owns its query, its year, and its own loading and error state, so a
 * failure here leaves the figures and the cashier table beside it intact.
 * Rendered only on the admin branch, so a cashier never requests it —
 * `/reports/*` would answer them with a 403.
 */
export function MonthlyEarningsSection() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const years = selectableYears(new Date().getFullYear());

  const { data, isLoading, isError } = useQuery({
    queryKey: ["monthly-earnings", year],
    queryFn: () => getMonthlyEarnings(year),
  });

  return (
    <Card.Root>
      <Card.Header
        title="Monthly Earnings"
        actions={
          <Select
            label="Year"
            w={110}
            data={years.map(String)}
            value={String(year)}
            onChange={(value) => value && setYear(Number(value))}
            allowDeselect={false}
          />
        }
      />
      <Card.Divider />
      <Card.Body>
        {isError ? (
          <Text c="danger.7">Couldn't load monthly earnings.</Text>
        ) : isLoading || !data ? (
          <Skeleton height={280} />
        ) : (
          <Suspense fallback={<Skeleton height={280} />}>
            <MonthlyEarningsChart data={data.map(toChartPoint)} />
          </Suspense>
        )}
      </Card.Body>
    </Card.Root>
  );
}
