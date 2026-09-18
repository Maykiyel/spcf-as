import type { SeriesReceiptStatus } from "../types";

/** On-screen names. Total over the union, so a fifth status is a compile
 * error here rather than a blank cell. */
export const SERIES_RECEIPT_STATUS_LABEL: Record<SeriesReceiptStatus, string> =
  {
    queued: "Queued",
    active: "Active",
    exhausted: "Exhausted",
    suspended: "Suspended",
  };
