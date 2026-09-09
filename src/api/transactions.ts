/** The scalar `TransactionResource` fields more than one feature reads, so
 * the Transactions list row and the Transactions Report row describe one wire
 * shape rather than two. No `status`: nothing outside Transactions reads it. */
export type TransactionScalars = {
  control_id: number;
  cashier: { id: number; full_name: string } | null;
  series_number: number | null;
  customer_name: string | null;
  total: number | null;
  amount_paid: number;
  change_amount: number;
  date: string;
};
