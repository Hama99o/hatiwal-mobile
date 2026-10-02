import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authAPI } from "@/api/auth";
import { useAuthStore } from "@/stores/auth.store";

type Mode = "buyer" | "seller";

const STORAGE_KEY = "hatiwal-mode";

interface ModeState {
  mode: Mode;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
  hydrateFromUser: (sellerMode: boolean) => void;
}

export const useModeStore = create<ModeState>((set, get) => ({
  mode: "buyer",
  setMode: (mode) => {
    set({ mode });
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => null);
    authAPI.updateMe({ sellerMode: mode === "seller" }).catch(() => null);
  },
  toggleMode: () => {
    const next = get().mode === "buyer" ? "seller" : "buyer";
    set({ mode: next });
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => null);
    authAPI.updateMe({ sellerMode: next === "seller" }).catch(() => null);
  },
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

// A session can end WITHOUT the logout button: a dead token (401 in
// api/http.ts or auth.bootstrap.ts) or a blocked account clears the user
// directly. Those paths never called resetMode, so a seller whose session died
// became a guest with the SELLER tab bar — "My Shop" + "Login", no Bazaar.
// A guest cannot sell, so any signed-in → signed-out transition resets here.
useAuthStore.subscribe((state, prev) => {
  if (prev.isAuthenticated && !state.isAuthenticated) {
    resetMode().catch(() => null);
  }
});
