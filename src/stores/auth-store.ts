import { create } from "zustand";
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from "zustand/middleware";
import type { AuthUser } from "@/features/auth/types";

const REMEMBER_ME_KEY = "auth-remember-me";

// Delegates to localStorage or sessionStorage depending on the user's choice at login
const dynamicStorage: StateStorage = {
  getItem: (name) => {
    const remember = localStorage.getItem(REMEMBER_ME_KEY) === "true";
    return (remember ? localStorage : sessionStorage).getItem(name);
  },
  setItem: (name, value) => {
    const remember = localStorage.getItem(REMEMBER_ME_KEY) === "true";
    (remember ? localStorage : sessionStorage).setItem(name, value);
  },
  removeItem: (name) => {
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  role: string | null;
  setAuth: (
    token: string,
    user: AuthUser,
    role: string | null,
    rememberMe: boolean,
  ) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      role: null,
      setAuth: (token, user, role, rememberMe) => {
        // set the flag BEFORE set() so persist writes to the right storage this time
        localStorage.setItem(REMEMBER_ME_KEY, String(rememberMe));
        set({ token, user, role });
      },
      logout: () => {
        localStorage.removeItem(REMEMBER_ME_KEY);
        set({ token: null, user: null, role: null });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => dynamicStorage),
    },
  ),
);
