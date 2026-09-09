import type { TransactionScalars } from "@/api/transactions";

/** One row of `GET /reports/transactions`. No item shape at all: the endpoint
 * eager-loads the cashier alone, and `whenLoaded` omits the key rather than
 * sending an empty array. Every row is `completed`, enforced server-side. */
export type TransactionReportRow = TransactionScalars;

/** One row of `GET /reports/services-sold`: a grouped aggregate keyed on a
 * service, not a service record. `service` is `whenLoaded`, so the key is
 * absent rather than null if the relation ever fails to load. */
export type ServiceSoldRow = {
  service: { id: number; name: string } | null;
  total_quantity: number;
  /** Revenue. `subtotal` is the wire's name for it, and its sort key. */
  subtotal: number;
};

/** One row of `GET /reports/services-sold/{service}`. The scalar-only
 * transaction shape again: this endpoint eager-loads the cashier alone,
 * and every row is `completed`, enforced server-side. */
export type ServiceBreakdownRow = TransactionScalars;
