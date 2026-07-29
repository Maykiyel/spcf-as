export type Role = "admin" | "cashier";

export type LoginCredentials = {
  username: string;
  password: string;
};

export type AuthUser = {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  user_name: string;
  email: string;
  role: Role; // was: string
};
