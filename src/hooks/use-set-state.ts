import { useCallback, useState } from "react";

// A `Set<T>` in state plus `add`/`remove`, each a no-op re-render if the
// item's membership doesn't actually change. add/remove/clear only close
// over `setSet` (guaranteed stable by React), so useCallback gives them a
// permanently stable identity — lets callers include them in a memoized
// context value without that value churning every render.
export function useSetState<T>() {
  const [set, setSet] = useState<Set<T>>(() => new Set());

  const add = useCallback((item: T) => {
    setSet((current) => {
      if (current.has(item)) return current;
      return new Set(current).add(item);
    });
  }, []);

  const remove = useCallback((item: T) => {
    setSet((current) => {
      if (!current.has(item)) return current;
      const next = new Set(current);
      next.delete(item);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSet(new Set()), []);

  return [set, { add, remove, clear }] as const;
}
