import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authAPI } from "@/api/auth";

type Mode = "buyer" | "seller";

const STORAGE_KEY = "hatiwal-mode";

interface ModeState {
  mode: Mode;
  /**
   * True while the mode change is still being saved.
   *
   * The switch itself is instant — the label and colours flip on the spot — but
   * the screens behind it refetch, so tapping it looked like nothing happened and
   * gave no clue whether to wait. This is what the toggle shows a spinner for.
   */
  syncing: boolean;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
  hydrateFromUser: (sellerMode: boolean) => void;
}

/** Apply a mode locally, then persist it — exposing `syncing` while it saves. */
function applyMode(set: (partial: Partial<ModeState>) => void, mode: Mode) {
  set({ mode, syncing: true });
  AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => null);
  authAPI
    .updateMe({ sellerMode: mode === "seller" })
    .catch(() => null)
    // Local state is authoritative for the UI, so a failed sync must not revert
    // the switch — it only stops the spinner. The choice is already persisted
    // locally and will re-sync on the next update.
    .finally(() => set({ syncing: false }));
}

export const useModeStore = create<ModeState>((set, get) => ({
  mode: "buyer",
  syncing: false,
  setMode: (mode) => applyMode(set, mode),
  toggleMode: () => applyMode(set, get().mode === "buyer" ? "seller" : "buyer"),
  hydrateFromUser: (sellerMode: boolean) => {
    const mode: Mode = sellerMode ? "seller" : "buyer";
    set({ mode });
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => null);
  },
}));

// Rehydrate on startup — load saved mode before first render
AsyncStorage.getItem(STORAGE_KEY)
  .then((saved) => {
    if (saved === "buyer" || saved === "seller") {
      useModeStore.setState({ mode: saved });
    }
  })
  .catch(() => null);

/** Reset mode to buyer and clear storage — call on logout. */
export async function resetMode(): Promise<void> {
  useModeStore.setState({ mode: "buyer" });
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => null);
}
