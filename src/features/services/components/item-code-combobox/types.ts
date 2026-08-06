export type ItemCodeSelection =
  | { kind: "existing"; id: number; name: string }
  | { kind: "new"; name: string };

export type ExistingItemCodeSelection = Extract<
  ItemCodeSelection,
  { kind: "existing" }
>;
