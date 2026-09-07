import { useEffect, useRef, useState } from "react";
import { TextInput } from "@mantine/core";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

/** Matches the debounce `useServerTableState` applies to search: a request
 * per keystroke would fire one for every prefix of what is typed. */
const DEBOUNCE_MS = 400;

/** `null` is "unfiltered" and gets dropped from the request; a text input
 * has no null, so this bridges at the control's edge. Trimmed, because
 * every text filter here is a partial match and a stray trailing space
 * would narrow rather than be ignored. */
const normalize = (draft: string): string | null => draft.trim() || null;

export type TableFilterTextProps = {
  /** The current value, or `null` for unfiltered. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Names the control for assistive tech, and scopes it in tests. */
  label: string;
  placeholder?: string;
};

/**
 * The shared free-text filter control: a value, a change, a debounce, and
 * the `null` to `""` bridge. Domain-agnostic. Wrappers that know an
 * endpoint's filter keys belong in their feature, per this folder's rule.
 */
export function TableFilterText({
  value,
  onChange,
  label,
  placeholder,
}: TableFilterTextProps) {
  const [draft, setDraft] = useState(value ?? "");
  const debounced = useDebouncedValue(draft, DEBOUNCE_MS);

  // In a ref, not a dependency: call sites pass an inline arrow, so naming
  // it below would re-run the effect whenever a published value didn't come
  // back (an undeclared filter key is dropped by `declaredOnly`). That is a
  // render loop, not a stale value.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Re-sync when the value changes elsewhere: a restored URL, back/forward,
  // a Clear on the page. Guarded on the draft's normalized form so this
  // control's own round trip can't clobber live typing, which would strip
  // the trailing space from "santos " the moment `santos` came back.
  useEffect(() => {
    setDraft((prev) => (normalize(prev) === value ? prev : (value ?? "")));
  }, [value]);

  useEffect(() => {
    const next = normalize(debounced);
    if (next === value) return;
    onChangeRef.current(next);
  }, [debounced, value]);

  return (
    <TextInput
      label={label}
      placeholder={placeholder}
      value={draft}
      onChange={(event) => setDraft(event.currentTarget.value)}
      w={{ base: "100%", xs: 180 }}
    />
  );
}
