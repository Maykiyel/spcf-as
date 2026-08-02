export type Service = {
  id: number;
  name: string;
  price: number;
  description: string | null;
  is_active: boolean;
  item_code?: { id: number; name: string };
};
