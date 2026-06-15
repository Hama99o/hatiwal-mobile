import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type BrowseViewMode = "grid" | "list";

interface BrowseViewModeState {
  viewMode: BrowseViewMode;
  setViewMode: (mode: BrowseViewMode) => void;
}

const STORAGE_KEY = "browse-view-mode";

export const useBrowseViewModeStore = create<BrowseViewModeState>((set) => ({
  viewMode: "grid",
  setViewMode: (mode) => {
    set({ viewMode: mode });
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
  },
}));

// Rehydrate on startup — load saved view mode before first render
AsyncStorage.getItem(STORAGE_KEY)
  .then((saved) => {
    if (saved === "grid" || saved === "list") {
      useBrowseViewModeStore.setState({ viewMode: saved });
    }
  })
  .catch(() => {});

/** Reset view mode to grid and clear storage — call on logout if desired. */
export async function resetBrowseViewMode(): Promise<void> {
  useBrowseViewModeStore.setState({ viewMode: "grid" });
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}
