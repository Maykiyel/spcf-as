export type Supplier = {
  id: number;
  name: string;
  contact_no: string;
  email: string;
  description: string | null;
  timestamps: {
    created_at: string;
    updated_at: string;
  };
};
