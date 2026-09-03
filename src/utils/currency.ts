export function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * `11501690` to `₱11.5M`, for places where the exact figure does not fit
 * and is not the point.
 *
 * Built for chart axis ticks. `formatCurrency` on an axis labelling
 * millions produces `₱11,501,690.00`, which is wider than recharts'
 * y-axis gutter, so the label is drawn outside the plot and clipped by
 * the card. Anywhere the exact figure matters, including the tooltip on
 * the same chart, keeps `formatCurrency`.
 */
export function formatCompactCurrency(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", {
    notation: "compact",
    maximumFractionDigits: 1,
  })}`;
}

// Money comparisons (e.g. "does amountPaid cover the total?") shouldn't be
// done on raw floats — summing several line-item subtotals can drift by a
// fraction of a centavo (binary floats can't represent most decimal
// fractions exactly), which would display as a clean total but still fail
// an exact >= comparison. Round to the nearest centavo before comparing.
export function roundToCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}
