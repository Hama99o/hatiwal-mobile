import { create } from "zustand";

interface ChatState {
  /**
   * Sum of unread messages across all conversations, capped at 99.
   * Used as the raw number for the chat tab badge (display "99+" above 99
   * is handled at the render site). This is a message-total, not a
   * conversation-count — use getUnreadTotal() to compute it.
   */
  unreadMessageTotal: number;
  setUnreadMessageTotal: (total: number) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  unreadMessageTotal: 0,
  setUnreadMessageTotal: (total) => set({ unreadMessageTotal: total }),
}));
