// A debounced write queue keyed by whatever the caller writes against.
// Coalescing stays with the caller, deliberately: see #103.
export type WriteQueue<K> = {
  schedule(key: K, flush: () => Promise<void>): void;
  // For a caller re-firing from its own settle path, where waiting another
  // window would strand the work it accumulated.
  flushNow(key: K, flush: () => Promise<void>): void;
  // The boolean lets a caller tear down the coalescing state that belonged
  // to the flush it just dropped.
  cancel(key: K): boolean;
  // Scheduled-but-unfired writes are not awaited; reset discards those.
  drain(): Promise<void>;
  reset(): void;
};

export type WriteQueueOptions<K> = {
  debounceMs: number;
  onPendingChange?: (pendingKeys: ReadonlySet<K>) => void;
};

export function createWriteQueue<K>({
  debounceMs,
  onPendingChange,
}: WriteQueueOptions<K>): WriteQueue<K> {
  const timers = new Map<K, ReturnType<typeof setTimeout>>();
  // A set per key, not one promise: a debounce that fires while the caller
  // is still busy adds a flush that no-ops immediately, and overwriting
  // would drop the real request from both the pending set and drain.
  const inFlight = new Map<K, Set<Promise<void>>>();
  const pending = new Set<K>();

  // A key is pending while it has work scheduled or in flight. Callers that
  // re-fire must register the next flush before the previous one is cleared,
  // or this emits a settled set for the render in between.
  const refreshPending = (key: K) => {
    const isPending = timers.has(key) || inFlight.has(key);
    if (isPending === pending.has(key)) return;

    if (isPending) pending.add(key);
    else pending.delete(key);
    onPendingChange?.(new Set(pending));
  };

  const run = (key: K, flush: () => Promise<void>) => {
    let running = inFlight.get(key);
    if (!running) {
      running = new Set();
      inFlight.set(key, running);
    }
    const claimed = running;

    const promise = flush().finally(() => {
      claimed.delete(promise);
      if (claimed.size === 0) inFlight.delete(key);
      refreshPending(key);
    });

    claimed.add(promise);
    refreshPending(key);
  };

  return {
    schedule(key, flush) {
      const existing = timers.get(key);
      if (existing) clearTimeout(existing);

      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key);
          run(key, flush);
        }, debounceMs),
      );
      refreshPending(key);
    },

    flushNow(key, flush) {
      run(key, flush);
    },

    cancel(key) {
      const existing = timers.get(key);
      if (!existing) return false;

      clearTimeout(existing);
      timers.delete(key);
      refreshPending(key);
      return true;
    },

    async drain() {
      for (;;) {
        const running = [...inFlight.values()].flatMap((set) => [...set]);
        if (running.length === 0) return;
        await Promise.allSettled(running);
      }
    },

    reset() {
      timers.forEach(clearTimeout);
      timers.clear();
      inFlight.clear();

      if (pending.size === 0) return;
      pending.clear();
      onPendingChange?.(new Set());
    },
  };
}
