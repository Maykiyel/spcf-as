/** A system-generated entry arrives with a null `id` and the name
 * "System", so there is no null case to write copy for. */
export type ActivityLogActor = {
  id: number | null;
  name: string;
  role: string | null;
};

/** One row of `GET /activity-logs`. `context` is a readable sentence and
 * `type` a display string ("Transaction - Void"), both rendered as they
 * arrive. Subject and details are the detail request's. */
export type ActivityLogListRow = {
  id: number;
  type: string;
  context: string;
  created_at: string;
  actor: ActivityLogActor;
};

/** The backend's formatter interface requires this shape for every
 * action, and formats `value` server-side — peso signs and `from → to`
 * arrows included. Printed verbatim; never parsed or re-formatted. */
export type ActivityLogDetailField = {
  label: string;
  value: string;
};

/** The record an entry acted on. `type` is a model class name in snake
 * case, derived at runtime rather than drawn from a fixed set. */
export type ActivityLogSubject = {
  type: string;
  id: number;
  exists: boolean;
};

/** `GET /activity-logs/{activity}`: the list row plus the only two
 * fields the drawer does not already hold at click time. */
export type ActivityLogDetail = ActivityLogListRow & {
  subject: ActivityLogSubject;
  details: ActivityLogDetailField[];
};
