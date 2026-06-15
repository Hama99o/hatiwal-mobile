import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MAX_HISTORY = 10;

interface SearchHistoryState {
  history: string[];
  add: (term: string) => void;
  remove: (term: string) => void;
  clear: () => void;
}

export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist(
    (set) => ({
      history: [],
      add: (term: string) => {
        const trimmed = term.trim();
        if (!trimmed || trimmed.length < 2) return;
        set((state) => {
          const filtered = state.history.filter((t) => t !== trimmed);
          return { history: [trimmed, ...filtered].slice(0, MAX_HISTORY) };
        });
      },
      remove: (term: string) =>
        set((state) => ({
          history: state.history.filter((t) => t !== term),
        })),
      clear: () => set({ history: [] }),
    }),
    {
      name: "search-history",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
