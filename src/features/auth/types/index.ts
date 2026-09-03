export type Role = "admin" | "cashier";

export type LoginCredentials = {
  username: string;
  password: string;
};

/** The signed-in user, as `GET /users/me` and `POST /login` send them.
 *
 * No `email`: backend `4955f19` dropped the column and the resource field.
 * `user_name` keeps the wire's own name, unlike `UserAccount.username` —
 * this is not a table row, so no sort key forces a rename. */
export type AuthUser = {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  user_name: string;
  role: Role; // was: string
};
