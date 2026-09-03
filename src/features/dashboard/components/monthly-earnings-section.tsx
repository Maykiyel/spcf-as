import { Suspense, lazy } from "react";
import { useSearchParams } from "react-router";
import { Select, Skeleton, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { getMonthlyEarnings } from "../api/get-monthly-earnings";
import type { MonthlyEarnings } from "../types";
import type { MonthlyEarningsPoint } from "./monthly-earnings-chart";

// Split per role, not per route. See the chart module for why.
//
// Nothing may import a *value* from that module — a plain import would
// pull the chunk back into this one and undo the split. The point type
// above is `import type`, which erases.
const MonthlyEarningsChart = lazy(() => import("./monthly-earnings-chart"));

/** The endpoint validates `year` as `min:2026`, max next year. Both ends
 * are the server's; this exists so the control cannot offer a year the
 * endpoint would answer with a 422. */
const EARLIEST_YEAR = 2026;

/** Shared by the chart and the placeholder standing in for it, so the
 * card doesn't jump when the data lands. Declared here rather than in the
 * chart module because importing a value from there would defeat the
 * lazy split. */
const CHART_HEIGHT = 280;

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

/** Every year the endpoint will accept, given the year it is now.
 *
 * The upper bound is read from the browser's clock while the endpoint
 * checks it against the server's. The two disagree for a few hours each
 * New Year — the app's timezone is UTC and it is used in UTC+8, so on
 * 1 January the browser is a year ahead until 08:00 — and in that window
 * the top entry would come back as a 422. Not worth a clock-sync
 * request; worth knowing before someone reports it. */
function selectableYears(currentYear: number): number[] {
  const years: number[] = [];
  for (let year = EARLIEST_YEAR; year <= currentYear + 1; year += 1) {
    years.push(year);
  }
  return years;
}

/** `2026-03` to `Mar`, by index rather than by parsing a date.
 *
 * `new Date("2026-03")` is parsed as UTC midnight and read back in local
 * time, which is harmless in UTC+8 and names the month before in any
 * negative offset. This application already has one UTC-boundary problem
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
 * failure here leaves the figures and the cashier table beside it
 * intact. Rendered only on the admin branch, so a cashier never requests
 * it — `/reports/*` would answer them with a 403.
 *
 * The year lives in the URL rather than in component state, so that a
 * refresh restores it and a link carries it, matching the table below
 * that already persists its page and sort. Following the same rules as
 * the tables do: the default is omitted rather than written out, and the
 * write replaces the history entry.
 */
export function MonthlyEarningsSection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentYear = new Date().getFullYear();
  const years = selectableYears(currentYear);

  // Only a year the endpoint accepts is read back, so a hand-edited or
  // stale link falls back to this year rather than reaching a 422.
  const requestedYear = Number(searchParams.get("year"));
  const year = years.includes(requestedYear) ? requestedYear : currentYear;

  const setYear = (next: number) => {
    setSearchParams(
      (previous) => {
        const params = new URLSearchParams(previous);
        if (next === currentYear) {
          params.delete("year");
        } else {
          params.set("year", String(next));
        }
        return params;
      },
      { replace: true },
    );
  };

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
          <Text c="danger">
            Couldn't load monthly earnings. Please try again.
          </Text>
        ) : isLoading || !data ? (
          <Skeleton height={CHART_HEIGHT} />
        ) : (
          <Suspense fallback={<Skeleton height={CHART_HEIGHT} />}>
            <MonthlyEarningsChart
              data={data.map(toChartPoint)}
              height={CHART_HEIGHT}
            />
          </Suspense>
        )}
      </Card.Body>
    </Card.Root>
  );
}
