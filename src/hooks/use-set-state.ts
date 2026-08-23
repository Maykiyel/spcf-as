import { useState } from "react";

// A `Set<T>` in state plus `add`/`remove`, each a no-op re-render if the
// item's membership doesn't actually change.
export function useSetState<T>() {
  const [set, setSet] = useState<Set<T>>(() => new Set());

  const add = (item: T) => {
    setSet((current) => {
      if (current.has(item)) return current;
      return new Set(current).add(item);
    });
  };

  const remove = (item: T) => {
    setSet((current) => {
      if (!current.has(item)) return current;
      const next = new Set(current);
      next.delete(item);
      return next;
    });
  };

  const clear = () => setSet(new Set());

  return [set, { add, remove, clear }] as const;
}
