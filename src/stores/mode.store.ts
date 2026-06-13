import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authAPI } from "@/api/auth";

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
