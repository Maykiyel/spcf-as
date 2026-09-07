import { BarChart } from "@mantine/charts";
import { formatCompactCurrency, formatCurrency } from "@/utils/currency";
import "@mantine/charts/styles.css";

/** Wide enough for a compact label like `₱11.5M` plus the 10px recharts
 * translates the tick by. Mantine's default gutter is sized for bare
 * numbers, so a peso-prefixed one overflows it and the card, which clips
 * to its own radius, cuts the label off at the edge. */
const Y_AXIS_WIDTH = 64;

export type MonthlyEarningsPoint = {
  month: string;
  total_earnings: number;
};

type MonthlyEarningsChartProps = {
  data: MonthlyEarningsPoint[];
  /** Passed in rather than declared here, so the placeholder the section
   * shows while this chunk loads is the same height and the card does
   * not jump. A shared constant would have to live in one module or the
   * other, and a value imported from here would undo the lazy split. */
  height: number;
};

/**
 * The only module touching `@mantine/charts`, kept separate so `lazy()`
 * holds recharts in a chunk no cashier downloads; route splitting alone
 * splits per route, not per role. Default export because `lazy()` wants
 * one.
 *
 * Bars, not a line: the endpoint zero-fills empty months, so a line would
 * read as a collapse and a recovery.
 */
export default function MonthlyEarningsChart({
  data,
  height,
}: MonthlyEarningsChartProps) {
  return (
    <BarChart
      h={height}
      data={data}
      dataKey="month"
      series={[{ name: "total_earnings", label: "Earnings", color: "primary.6" }]}
      // The tooltip keeps the exact figure. Only the axis is abbreviated,
      // because that is the one that has to fit in a fixed gutter.
      valueFormatter={formatCurrency}
      yAxisProps={{
        width: Y_AXIS_WIDTH,
        tickFormatter: formatCompactCurrency,
      }}
      withLegend={false}
      barProps={{ radius: 4 }}
    />
  );
}
