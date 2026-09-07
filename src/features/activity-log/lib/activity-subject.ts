import type { ActivityLogSubject } from "../types";

/** Subject types with a detail route in this app. Transactions are the
 * only one today; services, series receipts and accounts have no page to
 * link to, so they render named but unlinked. Adding a route here is all a
 * new one needs. */
const SUBJECT_ROUTES: Record<string, (id: number) => string> = {
  transaction: (id) => `/transactions/${id}`,
};

/** Where a subject can be opened, or `null` when it cannot: the record was
 * deleted, or its type has no route. Both cases are shown, not hidden. */
export function subjectRoute(subject: ActivityLogSubject): string | null {
  if (!subject.exists) return null;
  return SUBJECT_ROUTES[subject.type]?.(subject.id) ?? null;
}

/** "Transaction #1201". The type arrives as the model's name in snake
 * case, which is a readable label once the underscores are spaces. */
export function subjectLabel(subject: ActivityLogSubject): string {
  const words = subject.type.replace(/_/g, " ");
  const name = words.charAt(0).toUpperCase() + words.slice(1);
  return `${name} #${subject.id}`;
}
