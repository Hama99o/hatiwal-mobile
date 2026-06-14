import { http } from "./http";
import { convertKeysToCamel } from "@/utils/case-styles";

export interface PublicProfile {
  id: number;
  name: string;
  avatarUrl: string | null;
  city: string | null;
  bio: string | null;
  memberSince: string;
  soldCount: number;
  listingsCount: number;
  verified?: boolean;
}

export const usersAPI = {
  getPublicProfile: async (userId: number): Promise<PublicProfile> => {
    const response = await http.get(`/users/${userId}/public_profile`);
    const raw = convertKeysToCamel(response.data.user) as PublicProfile & { fullName?: string };
    // The serializer sends `full_name` → `fullName`; expose it as `name`.
    return { ...raw, name: raw.name ?? raw.fullName ?? "" };
  },

  blockUser: async (userId: number): Promise<void> => {
    await http.post(`/users/${userId}/block`, {});
  },

  unblockUser: async (userId: number): Promise<void> => {
    await http.delete(`/users/${userId}/block`);
  },
};
