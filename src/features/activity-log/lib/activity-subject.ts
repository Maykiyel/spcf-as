import type { ActivityLogSubject } from "../types";

/** Subject types with a detail route in this app. Transactions are the
 * only one today. */
const SUBJECT_ROUTES: Record<string, (id: number) => string> = {
  transaction: (id) => `/transactions/${id}`,
};

/** Every subject link out of this drawer comes from the same place, so
 * the origin is attached once here rather than per entry in
 * `SUBJECT_ROUTES` — a future subject type's route inherits it for free. */
export type SubjectRoute = { path: string; state: { from: "activityLog" } };

/** This app's word for each subject type, which is not always the wire's:
 * `ACCOUNT_CREATED` logs against the User model, and "Account" is what the
 * nav group, the page and the entry's own sentence all call it. */
const SUBJECT_NAMES: Record<string, string> = {
  transaction: "Transaction",
  service: "Service",
  series_receipt: "Series receipt",
  user: "Account",
};

/** Where a subject can be opened, or `null` when it cannot: the record was
 * deleted, or its type has no route. Both cases are shown, not hidden. */
export function subjectRoute(subject: ActivityLogSubject): SubjectRoute | null {
  if (!subject.exists) return null;
  const path = SUBJECT_ROUTES[subject.type]?.(subject.id);
  return path ? { path, state: { from: "activityLog" } } : null;
}

/** "Transaction #1201". The wire's type is a model class name in snake
 * case, derived at runtime, so an unmapped one falls back to it rather
 * than rendering nothing. */
export function subjectLabel(subject: ActivityLogSubject): string {
  const wireWords = subject.type.replace(/_/g, " ");
  const name =
    SUBJECT_NAMES[subject.type] ??
    wireWords.charAt(0).toUpperCase() + wireWords.slice(1);
  return `${name} #${subject.id}`;
}
