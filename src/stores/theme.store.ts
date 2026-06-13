import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { authAPI } from "@/api/auth";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeState {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

const STORAGE_KEY = "app-theme";

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "system",
  setTheme: (theme) => {
    set({ theme });
    AsyncStorage.setItem(STORAGE_KEY, theme).catch(() => {});
    authAPI.updateMe({ preferredTheme: theme }).catch(() => null);
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
