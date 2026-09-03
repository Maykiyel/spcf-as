import type { TransactionStatus } from "../types";

/**
 * Whether a transaction may be printed as an Acknowledgement Receipt.
 *
 * Only `completed`. CONTEXT.md already defines an Acknowledgement Receipt
 * as the printed artifact produced for one **completed** Transaction; this
 * is the code honouring a definition the project had already agreed.
 *
 * The two concrete artifacts that made it worth enforcing: a `returned`
 * transaction printed a receipt indistinguishable from a live one, saying
 * a payer paid when the payment had been reversed; and a `pending` one,
 * reachable by typing a control id into the address bar, printed two
 * copies with a blank payer, a blank series number and a zero total.
 *
 * **Fails closed, and deliberately does not watermark.** A "VOID" overlay
 * was considered and rejected: print output cannot be verified from the
 * development environment, so a watermark would ship unverified, and its
 * failure mode is a receipt that still looks *valid*. Refusing to print is
 * the only option whose failure mode is safe.
 *
 * Every other status stays fully viewable. Refusing to print is not
 * refusing to look.
 */
export function isPrintable(status: TransactionStatus): boolean {
  return status === "completed";
}

/**
 * What each status is called on screen. Total over `TransactionStatus`, so
 * adding a status to the union is a compile error here rather than a blank
 * badge somewhere.
 *
 * **`returned` displays as "Voided".** The admin action that produces it is
 * called Void, and showing a cashier the word "Returned" for the result of
 * voiding is exactly the ambiguity CONTEXT.md's glossary exists to prevent.
 * The other four are title-cased. No copy is invented to tell `abandoned`
 * and `cancelled` apart, because nothing in the app distinguishes them for
 * a cashier.
 */
export const TRANSACTION_STATUS_LABEL: Record<TransactionStatus, string> = {
  pending: "Pending",
  abandoned: "Abandoned",
  completed: "Completed",
  cancelled: "Cancelled",
  returned: "Voided",
};

/** Why the Print action is unavailable, said in the status's own words.
 * Sits beside the disabled button on the View page and stands alone on the
 * refused print page, so it has to read on its own either way. */
export function printRefusalReason(status: TransactionStatus): string {
  return `Only a completed transaction can be printed. This one is ${TRANSACTION_STATUS_LABEL[status].toLowerCase()}.`;
}

/** Stands in for a field that has no value yet, rather than rendering
 * nothing. A blank cell reads as "failed to load"; this reads as "not
 * assigned". Payer name, series number and total are all null until a
 * transaction is saved. */
export const NO_VALUE_PLACEHOLDER = "—";
