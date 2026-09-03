import { BarChart } from "@mantine/charts";
import { formatCurrency } from "@/utils/currency";
import "@mantine/charts/styles.css";

export type MonthlyEarningsPoint = {
  month: string;
  total_earnings: number;
};

type MonthlyEarningsChartProps = {
  data: MonthlyEarningsPoint[];
};

/**
 * The only module in the app that touches `@mantine/charts`, and the
 * reason it is a module of its own: `MonthlyEarningsSection` reaches it
 * through `lazy()`, so the charting library and recharts under it land in
 * a chunk nobody downloads until an admin opens the dashboard. Routes are
 * already split, but that splits per route, not per role, and a cashier
 * would otherwise pay for a component they are never shown.
 *
 * The stylesheet is imported here rather than in `mantine-provider.tsx`
 * for the same reason — it belongs to this chunk.
 *
 * Default export because `lazy()` wants one.
 *
 * **Bars, not a line or an area.** These are twelve discrete period
 * totals, not samples of a continuous signal, so interpolating between
 * them asserts something untrue. It matters more than usual because the
 * endpoint zero-fills empty months: a line would dive to zero and climb
 * back, reading as a collapse and a recovery. An area chart would add a
 * filled region encoding cumulative magnitude, which is meaningless for
 * bucketed sums.
 */
export default function MonthlyEarningsChart({
  data,
}: MonthlyEarningsChartProps) {
  return (
    <BarChart
      h={280}
      data={data}
      dataKey="month"
      series={[{ name: "total_earnings", label: "Earnings", color: "primary.6" }]}
      valueFormatter={formatCurrency}
      withLegend={false}
      barProps={{ radius: 4 }}
    />
  );
}
