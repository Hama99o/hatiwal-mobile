import { create } from "zustand";
import type { User } from "@/api/auth";

/**
 * Set when the API rejects the user as blocked (suspended/banned). The Login
 * screen reads it to show a localized "you are blocked" message + the admin's
 * reason. `status` drives which message is shown; `reason` is free admin text.
 */
export interface BlockedNotice {
  status: string;
  reason: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  blockedNotice: BlockedNotice | null;
  setUser: (user: User | null) => void;
  /**
   * Mark the session authenticated without (yet) having the user object —
   * used at startup when a stored token exists but server validation is still
   * in flight, so the UI never flashes the login screen for a logged-in user.
   */
  setAuthenticated: (value: boolean) => void;
  setBlockedNotice: (notice: BlockedNotice | null) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  blockedNotice: null,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setBlockedNotice: (notice) => set({ blockedNotice: notice }),
  clearUser: () => set({ user: null, isAuthenticated: false }),
}));
