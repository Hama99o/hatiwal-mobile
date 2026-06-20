import { http } from "./http";
import { secureStorage } from "@/utils/secure-storage";
import { convertKeysToCamel, convertKeysToSnake } from "@/utils/case-styles";

export interface User {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  fullName: string;
  city: string | null;
  province: string | null;
  phone: string | null;
  bio: string | null;
  latitude: number | null;
  longitude: number | null;
  avatarUrl: string | null;
  preferredLanguage: "en" | "ps" | "fa";
  preferredTheme: "light" | "dark" | "system";
  sellerMode: boolean;
  status: string;
  verified?: boolean;
  activeWarningsCount?: number;
  warningThreshold?: number;
  itemsActiveCount?: number;
  itemsSoldCount?: number;
  unreadMessageCount?: number;
  savedItemsCount?: number;
  itemsBoughtCount?: number;
  createdAt: string;
  pushToken?: string | null;
  /** Set when the account is in its 30-day deletion grace window (recoverable). */
  deletionScheduledAt?: string | null;
}

export interface LoginParams {
  email: string;
  password: string;
}

export interface RegisterParams {
  email: string;
  password: string;
  passwordConfirmation: string;
  firstname: string;
  lastname: string;
}

export const authAPI = {
  login: async (params: LoginParams): Promise<User> => {
    const response = await http.post("/auth/sign_in", convertKeysToSnake(params));
    // Persist auth headers explicitly so they are guaranteed stored before
    // any subsequent request fires (don't rely on the response interceptor race).
    await secureStorage.saveAuthHeaders({
      "access-token": response.headers["access-token"] || "",
      client: response.headers["client"] || "",
      uid: response.headers["uid"] || "",
      "token-type": response.headers["token-type"] || "Bearer",
      expiry: response.headers["expiry"] || "",
    });
    return convertKeysToCamel(response.data.data) as User;
  },

  register: async (params: RegisterParams): Promise<User> => {
    const response = await http.post("/auth/", convertKeysToSnake(params));
    await secureStorage.saveAuthHeaders({
      "access-token": response.headers["access-token"] || "",
      client: response.headers["client"] || "",
      uid: response.headers["uid"] || "",
      "token-type": response.headers["token-type"] || "Bearer",
      expiry: response.headers["expiry"] || "",
    });
    return convertKeysToCamel(response.data.data) as User;
  },

  logout: async (): Promise<void> => {
    await http.delete("/auth/sign_out");
    await secureStorage.clearAuthHeaders();
  },

  // Request account deletion (App Store 5.1.1(v) / Google Play). DELETE /auth
  // SCHEDULES a 30-day deletion: the account is hidden + logged out immediately
  // but recoverable by logging back in within the grace window. Auth headers are
  // cleared locally afterward — the caller then resets app state like logout.
  deleteAccount: async (): Promise<void> => {
    await http.delete("/auth");
    await secureStorage.clearAuthHeaders();
  },

  // Cancel a pending account deletion (user logged back in within the grace
  // window and chose to keep their account). Returns the restored user.
  restoreAccount: async (): Promise<User> => {
    const response = await http.post("/users/me/restore");
    return convertKeysToCamel(response.data.user) as User;
  },

  me: async (): Promise<User> => {
    const response = await http.get("/users/me");
    return convertKeysToCamel(response.data.user) as User;
  },

  updateMe: async (data: Partial<User>): Promise<User> => {
    const response = await http.put("/users/me", { user: convertKeysToSnake(data) });
    return convertKeysToCamel(response.data.user) as User;
  },

  updateAvatar: async (uri: string): Promise<User> => {
    const form = new FormData();
    (form as any).append("user[avatar]", { uri, name: "avatar.jpg", type: "image/jpeg" });
    const res = await http.put("/users/me", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return convertKeysToCamel(res.data.user) as User;
  },

  /**
   * Validate stored auth token with the server.
   * DeviseTokenAuth: GET /auth/validate_token
   * Responds 200 + { data: user } when valid, 401 when expired/missing.
   * Headers (access-token, client, uid) are attached automatically by the
   * http request interceptor; the response interceptor rotates them.
   */
  validateToken: async (): Promise<User> => {
    const response = await http.get("/auth/validate_token");
    return convertKeysToCamel(response.data.data) as User;
  },
};
