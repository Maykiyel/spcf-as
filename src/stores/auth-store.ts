import { create } from "zustand";
import type { AuthUser } from "@/features/auth/types";

type AuthStatus = "idle" | "checking" | "authenticated" | "unauthenticated";

type AuthState = {
  user: AuthUser | null;
  status: AuthStatus;
  setChecking: () => void;
  setUser: (user: AuthUser) => void;
  setUnauthenticated: () => void;
};

// export const useAuthStore = create<AuthState>()(
//   persist(
//     (set) => ({
//       user: null,
//       status: "idle",
//       setChecking: () => set({ status: "checking" }),
//       setUser: (user) => set({ user, status: "authenticated" }),
//       setUnauthenticated: () => set({ user: null, status: "unauthenticated" }),
//       logout: () => set({ user: null, status: "unauthenticated" }),
//     }),
//     {
//       name: "auth-storage",
//       storage: createJSONStorage(() => localStorage),
//       partialize: (state) => ({ user: state.user }),
//     },
//   ),
// );

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  status: "idle",
  setChecking: () => set({ status: "checking" }),
  setUser: (user) => set({ user, status: "authenticated" }),
  setUnauthenticated: () => set({ user: null, status: "unauthenticated" }),
}));
