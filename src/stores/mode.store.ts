import { create } from "zustand";

type Mode = "buyer" | "seller";

interface ModeState {
  mode: Mode;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
}

export const useModeStore = create<ModeState>((set, get) => ({
  mode: "buyer",
  setMode: (mode) => set({ mode }),
  toggleMode: () => set({ mode: get().mode === "buyer" ? "seller" : "buyer" }),
}));
