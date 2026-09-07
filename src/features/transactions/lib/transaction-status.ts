import type { TransactionStatus } from "../types";

/**
 * Only `completed` may be printed, per CONTEXT.md. A `returned` one used
 * to print a receipt indistinguishable from a live one.
 *
 * Fails closed rather than watermarking, since a failed watermark leaves a
 * receipt that still looks valid. This refuses printing, not looking.
 */
export function isPrintable(status: TransactionStatus): boolean {
  return status === "completed";
}

/** On-screen names. Total over the union, so adding a status is a compile
 * error here rather than a blank badge somewhere. `returned` reads
 * "Voided", after the action that produces it. */
export const TRANSACTION_STATUS_LABEL: Record<TransactionStatus, string> = {
  pending: "Pending",
  abandoned: "Abandoned",
  completed: "Completed",
  cancelled: "Cancelled",
  returned: "Voided",
};

/** Reads beside the disabled button on the View page and alone on the
 * refused print page, so it has to stand on its own either way. */
export function printRefusalReason(status: TransactionStatus): string {
  return `Only a completed transaction can be printed. This one is ${TRANSACTION_STATUS_LABEL[status].toLowerCase()}.`;
}
