// The inclusive range [from, to] has (to - from + 1) sheets.
export function computeToFromSheets(from: number, sheets: number): number {
  return from + sheets - 1;
}

export function computeSheetsFromTo(from: number, to: number): number {
  return to - from + 1;
}

type CreateSeriesReceiptFields = {
  cashierId: number;
  from: number;
  sheets: number;
};

export type CreateSeriesReceiptPayload = {
  account_id: number;
  from: number;
  to: number;
};

// Matches on the "from" field key (not message text) to detect the stale-range race.
export function isStaleFromError(errorData: unknown): boolean {
  if (!errorData || typeof errorData !== "object") return false;
  const errors = (errorData as { errors?: Record<string, unknown> }).errors;
  return !!errors && "from" in errors;
}

export function buildCreatePayload(
  fields: CreateSeriesReceiptFields,
): CreateSeriesReceiptPayload {
  return {
    account_id: fields.cashierId,
    from: fields.from,
    to: computeToFromSheets(fields.from, fields.sheets),
  };
}
