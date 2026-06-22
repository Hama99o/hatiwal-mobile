import { http } from "./http";
import { convertKeysToCamel } from "@/utils/case-styles";

export interface PublicProfile {
  id: number;
  name: string;
  avatarUrl: string | null;
  city: string | null;
  bio: string | null;
  /** Pre-formatted string from backend e.g. "June 2026" — not an ISO date. Display verbatim. */
  memberSince: string;
  soldCount: number;
  listingsCount: number;
  verified?: boolean;
  blocked?: boolean;
  /**
   * Percentage of conversations where seller replied within 24h (last 90 days).
   * null when the seller has fewer than 5 conversations (threshold not met).
   */
  responseRatePercent: number | null;
  /**
   * One of: "within_one_hour" | "within_a_day" | "within_a_few_days"
   * null when responseRatePercent is null.
   */
  responseTimeLabel: "within_one_hour" | "within_a_day" | "within_a_few_days" | null;
  /**
   * Privacy-safe coarse recency label derived from last_sign_in_at.
   * "today" = signed in < 24h ago; "this_week" = < 7d; "this_month" = < 30d.
   * null = no recent sign-in (> 30d ago) or no sign-in on record — omit the row.
   */
  lastActiveLabel?: "today" | "this_week" | "this_month" | null;
  /**
   * Canonical https share URL for this seller profile.
   * Present when PUBLIC_SHARE_BASE_URL is configured on the backend (e.g. "https://hatiwal.example.com/u/42").
   * null/undefined when the env var is unset — the mobile app falls back to a hatiwal://seller/<id> deep link.
   */
  shareUrl?: string | null;
  /**
   * True when the seller has set an away_until date that is still in the future.
   * Auto-expires server-side — a past date returns false. Omit the banner when false.
   */
  isAway?: boolean;
  /**
   * ISO-8601 datetime string when the seller is currently away; null otherwise.
   * Only present on the :public view when isAway is true.
   */
  awayUntil?: string | null;
}

export const usersAPI = {
  getPublicProfile: async (userId: number): Promise<PublicProfile> => {
    const response = await http.get(`/users/${userId}/public_profile`);
    const raw = convertKeysToCamel(response.data.user) as PublicProfile & { fullName?: string };
    // The serializer sends `full_name` → `fullName`; expose it as `name`.
    return { ...raw, name: raw.name ?? raw.fullName ?? "" };
  },

  /** The users the current user has blocked (GET /blocks, :public view). */
  getBlockedUsers: async (): Promise<PublicProfile[]> => {
    const response = await http.get(`/blocks`);
    const list = (response.data.users ?? []) as Array<Record<string, unknown>>;
    return list.map((u) => {
      const raw = convertKeysToCamel(u) as PublicProfile & { fullName?: string };
      return { ...raw, name: raw.name ?? raw.fullName ?? "" };
    });
  },

  blockUser: async (userId: number): Promise<void> => {
    await http.post(`/users/${userId}/block`, {});
  },

  unblockUser: async (userId: number): Promise<void> => {
    await http.delete(`/users/${userId}/block`);
  },
};
