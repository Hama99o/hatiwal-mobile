import { create } from "zustand";
import type { User } from "@/api/auth";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  /**
   * Mark the session authenticated without (yet) having the user object —
   * used at startup when a stored token exists but server validation is still
   * in flight, so the UI never flashes the login screen for a logged-in user.
   */
  setAuthenticated: (value: boolean) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  clearUser: () => set({ user: null, isAuthenticated: false }),
}));
