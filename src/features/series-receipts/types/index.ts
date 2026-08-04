export type Cashier = {
  id: number;
  full_name: string;
};

export type SeriesReceipt = {
  id: number;
  account: Cashier; // wire name for "cashier" — see CONTEXT.md
  from: number;
  to: number;
  remaining_sheets: number;
  createdBy: Cashier;
};
