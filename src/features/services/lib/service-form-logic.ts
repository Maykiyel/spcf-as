import type { ItemCodeSelection } from "../components/item-code-combobox";
import type {
  CreateServicePayload,
  ServiceInputFields,
} from "../api/create-service";

// Existing selection -> item_code_id, new selection -> item_code_name.
export function buildCreatePayload(
  fields: ServiceInputFields,
  selection: ItemCodeSelection,
): CreateServicePayload {
  return selection.kind === "existing"
    ? { ...fields, item_code_id: selection.id }
    : { ...fields, item_code_name: selection.name };
}

// True only when the selection is an existing item code different from
// the original — never true for a fresh/unset original.
export function didItemCodeChange(
  selection: ItemCodeSelection | null,
  original: { id: number } | null,
): boolean {
  if (!selection || !original) return false;
  return selection.kind === "existing" && selection.id !== original.id;
}
