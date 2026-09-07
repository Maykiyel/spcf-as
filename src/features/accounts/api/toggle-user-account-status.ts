import { apiClient } from "@/lib/axios/api-client";
import type { UserAccount } from "../types";

type ToggleUserAccountStatusArgs = {
  id: number;
  isActive: boolean;
};

/**
 * Switches an account on or off, and with it that cashier's series
 * receipt: `active` to `suspended` and back.
 *
 * Deactivation bites everywhere at once. The user stays signed in
 * client-side and is refused on every request until reactivated.
 *
 * camelCase here, `is_active` on the wire. `create-user-account.ts` goes
 * the other way on purpose; see the note there.
 */
export const toggleUserAccountStatus = async ({
  id,
  isActive,
}: ToggleUserAccountStatusArgs): Promise<UserAccount> => {
  const response = await apiClient.patch<UserAccount, { is_active: boolean }>(
    `/users/${id}/toggle-status`,
    { is_active: isActive },
  );
  return response.data;
};
