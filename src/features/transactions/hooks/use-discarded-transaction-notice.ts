import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { notifyWarning } from "@/lib/notifications/notifications";
import { getPendingTransactionCount } from "../api/get-pending-transaction-count";

const DISCARDED_MESSAGE =
  "A transaction you had in progress was discarded when this one started.";

/**
 * Tells the cashier when starting a transaction threw away one they had in
 * progress.
 *
 * `POST /transactions` abandons every pending transaction the cashier
 * already had before creating the new one, and its response does not
 * report what it discarded — so the only way to say so is to have counted
 * before. The count is asked for on mount and **never awaited on the way
 * to anything**: asking at creation time would put a round trip in front
 * of the cashier's first line item, which is worse than the occasionally
 * missed notice.
 *
 * A notification, not a dialog. The abandonment has already happened by
 * the time the transaction exists, so there is nothing to confirm and
 * nothing to undo, and blocking a cashier mid-service would cost them the
 * one thing this is meant to save.
 *
 * Lives in its own hook rather than inline in `TransactionBuilderProvider`
 * because it feeds neither of that provider's two context values — it is a
 * self-contained notice, the same shape of concern `useLineItemSync`
 * already is.
 */
export function useDiscardedTransactionNotice(transactionId: number | null) {
  // Three options, each closing a way this could warn about nothing.
  //
  // `staleTime: 0` alone is not enough: react-query still serves a cached
  // value immediately while it refetches, so a revisit would decide on the
  // *previous* visit's number. `gcTime: 0` drops the entry when the page
  // unmounts, so a revisit has no value to serve and the effect below
  // waits for the real one.
  //
  // `retry: false` against the app-wide two retries on network and 5xx
  // errors. A retry would be a *second* request, issued after this page
  // may already have created its transaction — and that request would
  // count the new pending row itself, warning the cashier that work was
  // discarded when the only pending row is their own. One attempt, taken
  // before anything was created, is the only question worth asking; if it
  // fails, the notice is simply missed, which the spec accepts.
  const { data: pendingBeforeStart } = useQuery({
    queryKey: ["transactions", "pending-count"],
    queryFn: getPendingTransactionCount,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  const hasReportedRef = useRef(false);

  useEffect(() => {
    // Waits for both. Until the count is in, the decision is not knowable,
    // and guessing either way is worse than the notice arriving late.
    if (transactionId === null || pendingBeforeStart === undefined) return;
    if (hasReportedRef.current) return;

    // Latched, so this fires once per mount. After a confirm the
    // transaction id resets to null and the next one re-runs this effect
    // against a count taken before the *first* transaction — by then the
    // cashier has nothing pending, and warning again would say work was
    // thrown away when none was.
    hasReportedRef.current = true;

    // Nothing was discarded, which is the normal case: a cashier who
    // cancels explicitly, as this app lets them, sees nothing at all.
    if (pendingBeforeStart === 0) return;

    notifyWarning(DISCARDED_MESSAGE);
  }, [transactionId, pendingBeforeStart]);
}
