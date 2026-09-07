import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { getTransaction } from "../api/get-transaction";
import { transactionDetailQueryKey } from "../api/transaction-query-keys";

// A non-numeric URL segment arrives as NaN. Gating keeps a doomed request
// off the wire and a NaN key out of the cache.
function isFetchableControlId(controlId: number): boolean {
  return Number.isInteger(controlId) && controlId > 0;
}

// Shared by the View and Print pages so their 403 classification can't
// drift apart. Inherits the app-wide `staleTime: 1000 * 60`, a bounded
// window that self-heals after a void where `Infinity` would pin one all
// session; voiding also removes this entry outright.
//
// That cache hit is what makes the Print page's StrictMode guard needed.
export function useTransactionDetail(controlId: number) {
  const canFetch = isFetchableControlId(controlId);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: transactionDetailQueryKey(controlId),
    queryFn: () => getTransaction(controlId),
    enabled: canFetch,
  });

  const isForbidden =
    isError && error instanceof AxiosError && error.response?.status === 403;

  const resolvedIsLoading = canFetch && isLoading;
  const resolvedIsError = !canFetch || isError;

  return {
    transaction: data,
    isLoading: resolvedIsLoading,
    isError: resolvedIsError,
    isForbidden,
    // "Nothing to render yet", derived once. All three consumers branch on
    // this rather than re-deriving the same four-term condition.
    isUnavailable:
      resolvedIsLoading || isForbidden || resolvedIsError || !data,
  };
}
