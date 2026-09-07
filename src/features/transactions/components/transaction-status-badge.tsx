import { Badge } from "@mantine/core";
import { TRANSACTION_STATUS_LABEL } from "../lib/transaction-status";
import type { TransactionStatus } from "../types";

// Green only for the status that means the payment stands. Total over the
// union, like `TRANSACTION_STATUS_LABEL`: a partial map with a fallback
// would give a sixth status a plausible badge in the wrong colour.
//
// Colour lives here rather than beside the label in `lib/`, so the print
// page needn't import a palette to render no badge at all.
const STATUS_COLOR: Record<TransactionStatus, string> = {
  pending: "tertiary",
  abandoned: "tertiary",
  completed: "success",
  cancelled: "tertiary",
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
    <Badge color={STATUS_COLOR[status]} variant="light">
      {TRANSACTION_STATUS_LABEL[status]}
    </Badge>
  );
}
