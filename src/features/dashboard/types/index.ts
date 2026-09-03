/** `GET /dashboard`, the one endpoint both roles share.
 *
 * It scopes itself: a cashier gets their own rows, an admin gets every
 * cashier's. That is why the dashboard's other two endpoints are the ones
 * that force a role branch and this one does not.
 *
 * The two figures do not count the same rows. `earnings_today` counts only
 * completed transactions; `transactions_today` does not filter by status,
 * so a voided transaction still adds to the count while adding nothing to
 * the earnings. They can disagree, legitimately. See `BACKEND_NOTES.md`;
 * it is not something to correct from here. */
export type DashboardToday = {
  earnings_today: number;
  transactions_today: number;
};

/** One row of `GET /reports/cashier-earnings`, admin-only.
 *
 * `cashier_name` is this frontend's name for the endpoint's `full_name`,
 * translated in `get-cashier-earnings.ts` because it is also the sort key
 * the endpoint allow-lists. The reasoning lives there.
 *
 * Windowed on `completed_at`, unlike the monthly earnings endpoint, which
 * windows on `created_at`. Two figures on this page can therefore put a
 * month-boundary transaction in different periods. Neither is wrong; they
 * answer slightly different questions. */
export type CashierEarnings = {
  id: number;
  cashier_name: string;
  total_earnings: number;
};
