import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { authAPI } from "@/api/auth";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeState {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

const STORAGE_KEY = "app-theme";

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "system",
  setTheme: (theme) => {
    set({ theme });
    authAPI.updateMe({ preferredTheme: theme }).catch(() => null);
    // NO RESTART. This used to call reloadApp() "because Android's live theme
    // swap can be janky" — that was true before colours moved into useColors().
    // Every colour now comes from that hook, which subscribes to this store, and
    // there is not one `className` colour left in the app, so changing the theme
    // already re-renders everything reactively.
    //
    // The restart was the "lag" when switching theme: on Android it rebuilds the
    // whole React host (blank frame + splash), and on a dev build it re-fetches
    // the bundle from Metro over the network. iOS felt smooth because its restart
    // is faster and its bundle is local — the same restart, less visible.
    //
    // Persistence stays fire-and-forget: the UI is already correct, and the write
    // only matters for the next cold start.
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
