import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { getTransaction } from "../api/get-transaction";

// Both pages derive their id with `Number(useParams().controlId)`, so a
// non-numeric URL segment ("/transactions/abc") arrives here as NaN.
// Gating on this keeps a doomed GET /transactions/NaN off the wire and a
// NaN key out of the query cache; callers see it as a plain error state.
function isFetchableControlId(controlId: number): boolean {
  return Number.isInteger(controlId) && controlId > 0;
}

// Shared by ViewTransactionPage and the Print page so their 403
// classification can't silently drift apart.
//
// On caching: this inherits the app-wide `staleTime: 1000 * 60`
// (src/lib/react-query/react-query.ts), so a revisit within a minute is
// served from cache without a refetch.
//
// A confirmed transaction is nearly, but not entirely, immutable: this
// frontend can't change one (cancel is pending-only), but an admin can
// still void it server-side, moving it to `returned` — see
// BACKEND_NOTES.md. A bounded stale window is the right trade for that:
// it self-heals within a minute, where `staleTime: Infinity` would pin a
// voided transaction for the whole session.
//
// Note this cache hit is also what makes the Print page's StrictMode
// guard necessary: arriving from the View page, `transaction` is truthy
// on the very first render.
export function useTransactionDetail(controlId: number) {
  const canFetch = isFetchableControlId(controlId);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["transactions", controlId],
    queryFn: () => getTransaction(controlId),
    enabled: canFetch,
  });

  const isForbidden =
    isError && error instanceof AxiosError && error.response?.status === 403;

  return {
    transaction: data,
    isLoading: canFetch && isLoading,
    isError: !canFetch || isError,
    isForbidden,
  };
}
