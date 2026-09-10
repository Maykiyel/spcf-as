import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createWriteQueue } from "./write-queue";

// Duplicated from use-line-item-sync.test.tsx rather than shared, because
// promoting it would mean editing that file, and #103 gate 1 requires it to
// pass untouched.
type Deferred<T = void> = { promise: Promise<T>; resolve: (value: T) => void };

function deferred<T = void>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

// A caller that refuses to start a second flush while its own is running,
// the way flushAddFeeItem guards on FeeAddState.inFlight.
function busyGuardedFlush(response: Deferred) {
  let busy = false;
  return async () => {
    if (busy) return;
    busy = true;
    try {
      await response.promise;
    } finally {
      busy = false;
    }
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createWriteQueue — debounce and pending", () => {
  it("runs a scheduled flush once the debounce elapses, not before", async () => {
    const queue = createWriteQueue<number>({ debounceMs: 400 });
    const flush = vi.fn(async () => {});

    queue.schedule(1, flush);
    await vi.advanceTimersByTimeAsync(399);
    expect(flush).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it("reports a key as pending from scheduling until its flush settles", async () => {
    const onPendingChange = vi.fn<(keys: ReadonlySet<number>) => void>();
    const queue = createWriteQueue<number>({ debounceMs: 400, onPendingChange });
    const response = deferred();

    queue.schedule(1, () => response.promise);
    expect(onPendingChange).toHaveBeenLastCalledWith(new Set([1]));

    await vi.advanceTimersByTimeAsync(400);
    expect(onPendingChange).toHaveBeenLastCalledWith(new Set([1]));

    response.resolve();
    await flushMicrotasks();
    expect(onPendingChange).toHaveBeenLastCalledWith(new Set());
  });

  it("keeps a key pending when a later flush no-ops because the caller is still busy", async () => {
    const onPendingChange = vi.fn<(keys: ReadonlySet<number>) => void>();
    const queue = createWriteQueue<number>({ debounceMs: 400, onPendingChange });
    const response = deferred();
    const flush = busyGuardedFlush(response);

    queue.schedule(1, flush);
    await vi.advanceTimersByTimeAsync(400);

    queue.schedule(1, flush);
    await vi.advanceTimersByTimeAsync(400);
    expect(onPendingChange).toHaveBeenLastCalledWith(new Set([1]));

    response.resolve();
    await flushMicrotasks();
    expect(onPendingChange).toHaveBeenLastCalledWith(new Set());
  });

  it("keeps a key pending across a re-fire, without a window where it reads settled", async () => {
    const seen: boolean[] = [];
    const queue = createWriteQueue<number>({
      debounceMs: 400,
      onPendingChange: (keys) => seen.push(keys.has(1)),
    });

    let refires = 1;
    const response = deferred();
    const flush = async () => {
      await response.promise;
      if (refires > 0) {
        refires -= 1;
        queue.flushNow(1, flush);
      }
    };

    queue.schedule(1, flush);
    await vi.advanceTimersByTimeAsync(400);
    response.resolve();
    await flushMicrotasks();

    // The blip this guards against would let isLineItemLocked read false for
    // one render between a flush settling and its re-fire registering.
    expect(seen).toEqual([true, false]);
  });
});

describe("createWriteQueue — coalescing the callers own", () => {
  it("re-fires a flush whose caller accumulated more work while it was in flight", async () => {
    const queue = createWriteQueue<number>({ debounceMs: 400 });
    const sent: number[] = [];
    const firstResponse = deferred();

    // Models flushAddFeeItem: accumulate, guard, re-fire from its finally.
    let pendingCount = 0;
    let inFlight = false;
    const flush = async (): Promise<void> => {
      if (inFlight) return;
      const quantity = pendingCount;
      if (quantity <= 0) return;
      pendingCount = 0;
      inFlight = true;
      try {
        sent.push(quantity);
        if (sent.length === 1) await firstResponse.promise;
      } finally {
        inFlight = false;
        if (pendingCount > 0) queue.flushNow(1, flush);
      }
    };

    pendingCount += 1;
    queue.schedule(1, flush);
    await vi.advanceTimersByTimeAsync(400);
    expect(sent).toEqual([1]);

    pendingCount += 1;
    queue.schedule(1, flush);
    await vi.advanceTimersByTimeAsync(400);
    expect(sent).toEqual([1]);

    firstResponse.resolve();
    await flushMicrotasks();
    expect(sent).toEqual([1, 1]);
  });

  it("lets a newer request supersede an in-flight response", async () => {
    const queue = createWriteQueue<string>({ debounceMs: 400 });
    const applied: number[] = [];
    const responses = new Map<number, Deferred>();

    // Models syncLineItemQuantity: keep the newest, compare on response.
    let latest = 0;
    const flush = async (): Promise<void> => {
      const requested = latest;
      const response = deferred();
      responses.set(requested, response);
      await response.promise;
      if (latest !== requested) return;
      applied.push(requested);
    };

    latest = 5;
    queue.schedule("501", flush);
    await vi.advanceTimersByTimeAsync(400);

    latest = 9;
    queue.schedule("501", flush);
    responses.get(5)!.resolve();
    await flushMicrotasks();
    expect(applied).toEqual([]);

    await vi.advanceTimersByTimeAsync(400);
    responses.get(9)!.resolve();
    await flushMicrotasks();
    expect(applied).toEqual([9]);
  });
});

describe("createWriteQueue — drain", () => {
  it("waits for every in-flight flush across keys", async () => {
    const queue = createWriteQueue<number>({ debounceMs: 400 });
    const first = deferred();
    const second = deferred();

    queue.schedule(1, () => first.promise);
    queue.schedule(2, () => second.promise);
    await vi.advanceTimersByTimeAsync(400);

    let drained = false;
    const draining = queue.drain().then(() => {
      drained = true;
    });

    first.resolve();
    await flushMicrotasks();
    expect(drained).toBe(false);

    second.resolve();
    await draining;
    expect(drained).toBe(true);
  });

  it("waits for a flush re-fired while the drain is already running", async () => {
    const queue = createWriteQueue<number>({ debounceMs: 400 });
    const responses = [deferred(), deferred()];
    let round = 0;

    const flush = async (): Promise<void> => {
      const response = responses[round];
      round += 1;
      await response.promise;
      if (round < responses.length) queue.flushNow(1, flush);
    };

    queue.schedule(1, flush);
    await vi.advanceTimersByTimeAsync(400);

    let drained = false;
    const draining = queue.drain().then(() => {
      drained = true;
    });

    // This second round is what MAX_CANCEL_DRAIN_ROUNDS existed to bound.
    responses[0].resolve();
    await flushMicrotasks();
    expect(drained).toBe(false);

    responses[1].resolve();
    await draining;
    expect(drained).toBe(true);
  });

  it("still waits for a busy caller's flush when a later one no-opped", async () => {
    const queue = createWriteQueue<number>({ debounceMs: 400 });
    const response = deferred();
    const flush = busyGuardedFlush(response);

    queue.schedule(1, flush);
    await vi.advanceTimersByTimeAsync(400);
    queue.schedule(1, flush);
    await vi.advanceTimersByTimeAsync(400);

    let drained = false;
    const draining = queue.drain().then(() => {
      drained = true;
    });

    await flushMicrotasks();
    expect(drained).toBe(false);

    response.resolve();
    await draining;
    expect(drained).toBe(true);
  });

  it("does not wait for a scheduled but unfired flush", async () => {
    const queue = createWriteQueue<number>({ debounceMs: 400 });
    const flush = vi.fn(async () => {});
    queue.schedule(1, flush);

    // cancel() has always discarded a debounced write via reset rather than
    // awaiting it, so draining one must not block on its timer.
    await queue.drain();
    expect(flush).not.toHaveBeenCalled();
  });
});

describe("createWriteQueue — cancel and reset", () => {
  it("drops a scheduled flush and reports that it did", async () => {
    const queue = createWriteQueue<string>({ debounceMs: 400 });
    const flush = vi.fn(async () => {});

    queue.schedule("501", flush);
    expect(queue.cancel("501")).toBe(true);

    await vi.advanceTimersByTimeAsync(400);
    expect(flush).not.toHaveBeenCalled();
  });

  it("reports false when there was no scheduled flush to drop", () => {
    const queue = createWriteQueue<string>({ debounceMs: 400 });
    expect(queue.cancel("501")).toBe(false);
  });

  it("clears scheduled work and pending keys on reset", async () => {
    const onPendingChange = vi.fn<(keys: ReadonlySet<number>) => void>();
    const queue = createWriteQueue<number>({ debounceMs: 400, onPendingChange });
    const flush = vi.fn(async () => {});

    queue.schedule(1, flush);
    queue.reset();
    expect(onPendingChange).toHaveBeenLastCalledWith(new Set());

    await vi.advanceTimersByTimeAsync(400);
    expect(flush).not.toHaveBeenCalled();
  });
});
