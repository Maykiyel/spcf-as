import { apiClient } from "@/lib/axios/api-client";
import type { UserAccount } from "../types";

type ToggleUserAccountStatusArgs = {
  id: number;
  isActive: boolean;
};

/**
 * Switches an account on or off, and with it that user's series receipt.
 * Deactivating moves their `active` series to `suspended`; reactivating
 * moves a `suspended` series back to `active`. Only cashiers hold one, so
 * only cashiers feel that half.
 *
 * Deactivation bites immediately and everywhere: `EnsureAccountIsActive`
 * wraps the whole authenticated group, so the user stays signed in
 * client-side and is refused on every request until reactivated.
 *
 * `isActive` is camelCase here and `is_active` on the wire, the same
 * translate-at-the-boundary rule the series receipt feature follows.
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
