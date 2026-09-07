import { AxiosError } from "axios";

/**
 * Pulls the per-field messages out of a Laravel 422, which keys its
 * `errors` bag by the request's own field names. Only the first message
 * per field is kept, the form showing one under each input.
 *
 * Anything that is not a validation failure returns `{}`, so the caller
 * can treat "nothing matched a field" as "show a toast instead".
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
