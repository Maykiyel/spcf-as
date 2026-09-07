/** Who performed an action. A system-generated entry arrives with a null
 * `id` and the name "System", so there is no null case for the UI to
 * invent copy for. */
export type ActivityLogActor = {
  id: number | null;
  name: string;
  role: string | null;
};

/** One row of `GET /activity-logs`.
 *
 * `context` is the readable sentence, generated when the entry was
 * written, and `type` is already a display string ("Transaction - Void"),
 * not a code. Both are rendered as they arrive; nothing here is built
 * client-side. The list carries no subject and no details — those are what
 * the detail request is for. */
export type ActivityLogListRow = {
  id: number;
  type: string;
  context: string;
  created_at: string;
  actor: ActivityLogActor;
};

/** One field of an entry's detail. Values arrive fully formatted, currency
 * symbols and before/after arrows included, so they are printed verbatim.
 * The backend's formatter interface requires this shape for every action,
 * which is what lets seventeen event types render through one component. */
export type ActivityLogDetailField = {
  label: string;
  value: string;
};

/** The record an entry acted on. `type` is the model's name in snake case
 * (`transaction`, `service`, `series_receipt`, `user`), and `exists` is
 * false once the record has been deleted. */
export type ActivityLogSubject = {
  type: string;
  id: number;
  exists: boolean;
};

/** `GET /activity-logs/{activity}`. A superset of the list row: the drawer
 * already holds everything but `subject` and `details` at click time. */
export type ActivityLogDetail = ActivityLogListRow & {
  subject: ActivityLogSubject;
  details: ActivityLogDetailField[];
};
