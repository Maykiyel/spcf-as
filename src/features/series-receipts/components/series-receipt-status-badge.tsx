import { StatusBadge, type Tone } from "@/components/ui/status-badge";
import { SERIES_RECEIPT_STATUS_LABEL } from "../lib/series-receipt-status";
import type { SeriesReceiptStatus } from "../types";

// Total over the union, so a fifth status is a compile error rather than a
// blank badge. `suspended` is the one state an admin caused and can undo —
// see CONTEXT.md's **Series receipt**.
const STATUS_TONE: Record<SeriesReceiptStatus, Tone> = {
  active: "success",
  queued: "tertiary",
  exhausted: "neutral",
  suspended: "warning",
};

/** Read-only: this feature has no status control, since the backend
 * derives every case from cashier assignment and account state. */
export function SeriesReceiptStatusBadge({
  status,
}: {
  status: SeriesReceiptStatus;
}) {
  return (
    <StatusBadge
      label={SERIES_RECEIPT_STATUS_LABEL[status]}
      tone={STATUS_TONE[status]}
    />
  );
}
