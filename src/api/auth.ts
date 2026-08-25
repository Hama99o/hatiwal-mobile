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
  /**
   * Whether this account's email address has been confirmed.
   *
   * The API sends a boolean, not the timestamp — the client only needs it to
   * decide whether to show the "confirm your email" prompt. Undefined on an older
   * API build, which is treated as CONFIRMED so the prompt can never appear
   * spuriously for someone who cannot act on it.
   */
  emailConfirmed?: boolean;
  activeWarningsCount?: number;
  warningThreshold?: number;
  itemsActiveCount?: number;
  itemsSoldCount?: number;
  unreadMessageCount?: number;
  savedItemsCount?: number;
  /** Completed sales as SELLER, sourced from the transactions table (TASK-TX02). */
  soldCount?: number;
  /** Completed purchases as BUYER, sourced from the transactions table (TASK-TX02). */
  boughtCount?: number;
  createdAt: string;
  pushToken?: string | null;
  /** REV2 — combined double-blind rating across both seller/buyer roles. null when reviewCount is 0. */
  avgRating?: number | null;
  reviewCount?: number;
  /** Set when the account is in its 30-day deletion grace window (recoverable). */
  deletionScheduledAt?: string | null;
  /**
   * True when away_until is set and in the future. Read from :me view.
   * Omit the banner in the seller's own profile when editing.
   */
  isAway?: boolean;
  /**
   * ISO-8601 datetime string of the away-mode expiry, or null when not away.
   * Set via PUT /users/me { user: { away_until: "<iso>" | null } }.
   */
  awayUntil?: string | null;
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

  /**
   * Ask the API to send the confirmation email again.
   *
   * DeviseTokenAuth's own endpoint (POST /auth/confirmation). `redirect_url` is
   * required by DTA for this action; the API's configured confirm URL is the only
   * destination it will actually honour (see its ConfirmationsController), so what
   * is sent here cannot redirect a user anywhere else.
   *
   * Resend matters more than it looks: without it, every confirmation email that
   * lands in spam is a dead account with no way back.
   */
  resendConfirmation: async (email: string): Promise<void> => {
    await http.post("/auth/confirmation", { email });
  },

  forgotPassword: async (email: string): Promise<void> => {
    await http.post("/auth/password", { email });
  },

  googleSignIn: async (idToken: string): Promise<User> => {
    const response = await http.post("/auth/google", { id_token: idToken });
    // Google auth returns tokens in the response body (not headers)
    await secureStorage.saveAuthHeaders({
      "access-token": response.data["access-token"] || "",
      client: response.data.client || "",
      uid: response.data.uid || "",
      "token-type": response.data["token-type"] || "Bearer",
      expiry: String(response.data.expiry || ""),
    });
    return convertKeysToCamel(response.data.data) as User;
  },
};
