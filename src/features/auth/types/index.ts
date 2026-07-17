export type LoginCredentials = {
  username: string;
  password: string;
  rememberMe: boolean;
};

export type AuthUser = {
  id: string;
  username: string;
};

export type LoginResponse = {
  user: AuthUser;
  token: string;
};
