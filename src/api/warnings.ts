import { http } from "./http";
import { convertKeysToCamel } from "@/utils/case-styles";

export interface UserWarning {
  id: number;
  category: string;
  reason: string;
  createdAt: string;
  expiresAt: string;
  acknowledgedAt: string | null;
  active: boolean;
}

export interface WarningsResult {
  warnings: UserWarning[];
  activeCount: number;
  threshold: number;
}

export const warningsAPI = {
  /** The signed-in user's own moderation warnings + active count / threshold. */
  list: async (): Promise<WarningsResult> => {
    const res = await http.get("/users/warnings");
    const data = convertKeysToCamel(res.data) as {
      warnings: UserWarning[];
      meta: { activeCount: number; threshold: number };
    };
    return {
      warnings: data.warnings ?? [],
      activeCount: data.meta?.activeCount ?? 0,
      threshold: data.meta?.threshold ?? 0,
    };
  },

  /** Mark active warnings as seen (dismisses the "new warning" treatment). */
  markSeen: async (): Promise<void> => {
    await http.put("/users/warnings/mark_seen");
  },
};
