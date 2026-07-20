export type LoginCredentials = {
  username: string;
  password: string;
  rememberMe: boolean;
};

export type AuthUser = {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  user_name: string;
  email: string;
};

export type LoginResponse = {
  user: AuthUser;
  token: string;
  role: string | null;
};
