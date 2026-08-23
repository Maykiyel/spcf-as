// Shared across features (Services catalog + Transactions fee catalog) —
// see CONTEXT.md's `src/api/` entry. Fetchers stay feature-local until a
// second feature actually needs one; only the shape is promoted here.
export type Service = {
  id: number;
  name: string;
  price: number;
  description: string | null;
  is_active: boolean;
  item_code?: { id: number; name: string };
};
