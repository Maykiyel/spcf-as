export function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
