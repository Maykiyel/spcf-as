export function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** `11501690` to `₱11.5M`, for chart axis ticks, where the full figure is
 * wider than recharts' y-axis gutter and gets clipped. Anywhere the exact
 * figure matters, including that chart's tooltip, keeps `formatCurrency`. */
export function formatCompactCurrency(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", {
    notation: "compact",
    maximumFractionDigits: 1,
  })}`;
}

// Round before comparing money: summed subtotals drift by a fraction of a
// centavo, which displays clean but fails an exact >= check.
export function roundToCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}
