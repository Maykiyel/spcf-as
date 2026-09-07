/** `GET /dashboard`, the one endpoint both roles share; it scopes itself.
 *
 * The two figures count different rows: `earnings_today` is completed
 * only, `transactions_today` filters by no status, so a voided
 * transaction adds to one and not the other. They disagree legitimately. */
export type DashboardToday = {
  earnings_today: number;
  transactions_today: number;
};

/** One row of `GET /reports/cashier-earnings`, admin-only. `cashier_name`
 * renames the wire's `full_name`; see `get-cashier-earnings.ts`.
 *
 * Windowed on `completed_at`, where monthly earnings uses `created_at`, so
 * the two can put a month-boundary transaction in different periods. */
export type CashierEarnings = {
  id: number;
  cashier_name: string;
  total_earnings: number;
};

/** One entry of `GET /reports/monthly-earnings`, admin-only. `month` is
 * `YYYY-MM`, and twelve always arrive zero-filled, which is why bars are
 * honest here and a line is not: a line would read an empty month as a
 * collapse and a recovery. Windowed on `created_at`; see above. */
export type MonthlyEarnings = {
  month: string;
  total_earnings: number;
};
