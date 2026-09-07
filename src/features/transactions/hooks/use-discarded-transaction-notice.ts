import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { notifyWarning } from "@/lib/notifications/notifications";
import { getPendingTransactionCount } from "../api/get-pending-transaction-count";

const DISCARDED_MESSAGE =
  "A transaction you had in progress was discarded when this one started.";

/**
 * Tells the cashier when starting a transaction threw away one they had in
 * progress. `POST /transactions` abandons their pending transactions
 * without reporting it, so the count has to be taken beforehand.
 *
 * Never awaited on the way to anything: a round trip in front of the first
 * line item is worse than an occasionally missed notice. A notification
 * rather than a dialog, since it has already happened and cannot be undone.
 */
export function useDiscardedTransactionNotice(transactionId: number | null) {
  // `gcTime: 0` as well as `staleTime: 0`, or a revisit decides on the
  // previous visit's cached number. `retry: false` because a retry would
  // land after this page created its transaction and count that new row,
  // warning about work that was never discarded.
  const { data: pendingBeforeStart } = useQuery({
    queryKey: ["transactions", "pending-count"],
    queryFn: getPendingTransactionCount,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  const hasReportedRef = useRef(false);

  useEffect(() => {
    // Until the count is in, the decision isn't knowable.
    if (transactionId === null || pendingBeforeStart === undefined) return;
    if (hasReportedRef.current) return;

    // Latched to once per mount: after a confirm the id resets to null, and
    // the next transaction would otherwise re-warn against a stale count.
    hasReportedRef.current = true;

    // The normal case: a cashier who cancels explicitly sees nothing.
    if (pendingBeforeStart === 0) return;

    notifyWarning(DISCARDED_MESSAGE);
  }, [transactionId, pendingBeforeStart]);
}
