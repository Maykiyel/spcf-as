import { Badge } from "@mantine/core";
import { TRANSACTION_STATUS_LABEL } from "../lib/transaction-status";
import type { TransactionStatus } from "../types";

// Green only for the one status that means the payment stands. `returned`
// is the outcome of an admin voiding a completed transaction, so it is the
// one a cashier most needs to notice.
//
// Total over the union, like `TRANSACTION_STATUS_LABEL`, and for the same
// reason: a partial map with a fallback would give a sixth status a
// plausible-looking badge in the wrong colour, silently. The label map gets
// that right; a colour map beside it that didn't would undo half of it.
//
// Colour stays in a component rather than joining the label in `lib/`,
// because the print page renders a transaction's status nowhere and
// shouldn't import a palette to do it.
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
