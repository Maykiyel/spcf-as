import { AxiosError } from "axios";

/**
 * Pulls the per-field messages out of a Laravel validation failure.
 *
 * A 422 from this API carries `{ message, errors: { field: [msg, ...] } }`,
 * keyed by the request's own field names. Only the first message per field
 * is kept: the form shows one message under one input, and Laravel orders
 * the bag with the rule that actually failed first.
 *
 * Returns an empty object for anything that isn't a validation failure —
 * a 500, a network error, a 422 with no bag — so the caller can treat
 * "nothing matched a field" as "show this as a toast instead".
 */
export function getServerFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof AxiosError)) return {};

  const data = error.response?.data as
    | { errors?: Record<string, unknown> }
    | undefined;
  const errors = data?.errors;
  if (!errors || typeof errors !== "object") return {};

  const fieldErrors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(errors)) {
    const first = Array.isArray(messages) ? messages[0] : messages;
    if (typeof first === "string") fieldErrors[field] = first;
  }
  return fieldErrors;
}
