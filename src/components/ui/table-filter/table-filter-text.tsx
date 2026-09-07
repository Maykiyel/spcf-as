import { useEffect, useRef, useState } from "react";
import { TextInput } from "@mantine/core";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

/** Matches the debounce `useServerTableState` applies to search, and for
 * the same reason: a filter that reached the network per keystroke would
 * fire a request for every prefix of what the user is typing. */
const DEBOUNCE_MS = 400;

/** `null` is "unfiltered", and is what `useServerTableState` drops from the
 * request rather than sending empty. A text input has no null, so this
 * stands in for it at the control's edge and nowhere else.
 *
 * Trimmed, because every text filter this API offers is a partial match —
 * a trailing space the user didn't mean to type would narrow the result
 * rather than being ignored. */
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
 * The shared free-text filter control. Domain-agnostic: it knows that a
 * table filter is a string or `null`, that a text input holds neither, and
 * that a request per keystroke is wrong. It knows nothing about payers,
 * series numbers or item names.
 *
 * The same shape as `TableFilterSegments` — takes a value, reports a
 * change, knows nothing about the URL — with the two pieces worth sharing
 * factored out: the `null` ↔ `""` bridge and the debounce. Both are what a
 * second implementation would get subtly wrong, by sending `""` to an
 * endpoint that answers an empty filter key with a 400, or by putting a
 * request on the wire for `s`, `sa`, `san` and `sant` on the way to
 * `santos`.
 *
 * **Domain-specific wrappers stay in their feature**, per this folder's
 * own rule: a control that knows `/transactions` filters payer name under
 * the key `customer` belongs in that feature.
 */
export function TableFilterText({
  value,
  onChange,
  label,
  placeholder,
}: TableFilterTextProps) {
  const [draft, setDraft] = useState(value ?? "");
  const debounced = useDebouncedValue(draft, DEBOUNCE_MS);

  // Held in a ref rather than named in the effect's dependencies below.
  // Call sites pass an inline arrow, so its identity changes every render,
  // and an effect that re-ran on it would call `onChange` again on any
  // render where the value it published didn't come back — which is what a
  // patch naming an undeclared filter key does (`declaredOnly` in
  // `use-table-controls.ts` drops it). That is a render loop, not a stale
  // value, so the ref is the fix rather than the omission.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Re-sync when the value changes from somewhere other than this control:
  // a restored URL, back/forward navigation, a Clear elsewhere on the page.
  //
  // Guarded on the draft's own normalized form rather than replacing the
  // draft outright, so the round trip this control just started doesn't
  // clobber what the user is still typing — "santos " would otherwise lose
  // its trailing space the moment `santos` came back.
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
