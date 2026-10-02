import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { authAPI } from "@/api/auth";
import { reloadApp } from "@/lib/reloadApp";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeState {
  theme: ThemePreference;
  /** Resolves after the choice is saved (and the app is restarting, if it changed). */
  setTheme: (theme: ThemePreference) => Promise<void>;
}

const STORAGE_KEY = "app-theme";

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "system",
  setTheme: async (theme) => {
    const changed = get().theme !== theme;
    set({ theme });
    authAPI.updateMe({ preferredTheme: theme }).catch(() => null);
    // Persist BEFORE reloading so the saved theme matches on next launch, then
    // reload for a clean apply (Android's live theme swap can be janky).
    // Awaitable so runAppTransition keeps its overlay up until the restart.
    await AsyncStorage.setItem(STORAGE_KEY, theme).catch(() => {});
    if (changed) reloadApp();
  },
}));

export async function loadSavedTheme(): Promise<void> {
  try {
    const saved = (await AsyncStorage.getItem(STORAGE_KEY)) as ThemePreference | null;
    if (saved && (saved === "light" || saved === "dark" || saved === "system")) {
      useThemeStore.setState({ theme: saved });
    }
  } catch {}
}

/** Apply a theme from the backend user object (no API sync — backend is the source). */
export function applyThemeFromUser(theme: ThemePreference): void {
  useThemeStore.setState({ theme });
  AsyncStorage.setItem(STORAGE_KEY, theme).catch(() => {});
}

/** Reset theme to system default and clear storage — call on logout. */
export async function resetTheme(): Promise<void> {
  useThemeStore.setState({ theme: "system" });
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}
