import { StatusBadge, type Tone } from "@/components/ui/status-badge";
import { TRANSACTION_STATUS_LABEL } from "../lib/transaction-status";
import type { TransactionStatus } from "../types";

// Total over the union, like `TRANSACTION_STATUS_LABEL`: a partial map
// with a fallback would give a sixth status a plausible tone in the wrong
// colour. `pending` is cyan, not amber — see the commit message.
//
// Colour lives here rather than beside the label in `lib/`, so the print
// page needn't import a palette to render no badge at all.
const STATUS_TONE: Record<TransactionStatus, Tone> = {
  pending: "tertiary",
  completed: "success",
  cancelled: "warning",
  abandoned: "neutral",
  returned: "danger",
};

/** A transaction's status, said the same way everywhere it appears. It was
 * the View page's private JSX until the receipts list needed the same
 * badge; two copies of a total colour map is exactly how the fifth status
 * ends up a different colour on one page than the other. */
export function TransactionStatusBadge({
  status,
}: {
  status: TransactionStatus;
}) {
  return (
    <StatusBadge
      label={TRANSACTION_STATUS_LABEL[status]}
      tone={STATUS_TONE[status]}
    />
  );
}
