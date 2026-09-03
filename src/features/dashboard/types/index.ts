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
