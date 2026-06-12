import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

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
