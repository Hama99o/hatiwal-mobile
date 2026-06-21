import axios from "axios";
import { secureStorage } from "@/utils/secure-storage";
import { useAuthStore } from "@/stores/auth.store";

/**
 * A blocked (suspended/banned) account is rejected with HTTP 403 and a body
 * carrying `status: "suspended" | "banned"` (+ an optional admin `reason`).
 * Returned for both the login response and any authenticated request.
 */
export function blockedNoticeFromResponse(
  httpStatus: number | undefined,
  data: any
): { status: string; reason: string | null } | null {
  if (httpStatus !== 403) return null;
  const accountStatus = data?.status;
  if (accountStatus !== "suspended" && accountStatus !== "banned") return null;
  return { status: accountStatus, reason: data?.reason ?? null };
}

export const BASE_URL =
  // The Rails API listens on 3007 (see docker-compose). EXPO_PUBLIC_API_URL
  // overrides this with the LAN address on device.
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3007/api/v1";

// A production build must point at a PUBLIC https:// API. EXPO_PUBLIC_* is
// inlined at build time, so a release that baked in localhost / a LAN IP / plain
// http would be dead on arrival (login + data fail) and would fail iOS ATS —
// a guaranteed App Store / Play rejection. Fail loudly at startup so such a
// build can never be shipped or reach review. (No effect in dev: __DEV__.)
function isProdUnsafeApiUrl(url: string): boolean {
  if (url.startsWith("http://")) return true; // non-TLS → blocked by iOS ATS
  return /(localhost|127\.0\.0\.1|10\.\d|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url);
}

if (!__DEV__ && isProdUnsafeApiUrl(BASE_URL)) {
  throw new Error(
    `[Hatiwal] Production build misconfigured: EXPO_PUBLIC_API_URL must be a public https:// URL, got "${BASE_URL}". ` +
      "Set it in the eas.json production profile before building."
  );
}

export const http = axios.create({
  baseURL: BASE_URL,
  // Fail fast instead of spinning forever when the API is unreachable (e.g. a
  // stale HOST_IP / wrong LAN address). Without this, a dead API address makes
  // the login button "load" indefinitely with no error shown.
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

http.interceptors.request.use(async (config) => {
  const accessToken = await secureStorage.getItem("access-token");
  const client = await secureStorage.getItem("client");
  const uid = await secureStorage.getItem("uid");

  if (accessToken && client && uid) {
    config.headers["access-token"] = accessToken;
    config.headers["client"] = client;
    config.headers["uid"] = uid;
    config.headers["token-type"] = "Bearer";
  }

  return config;
});

http.interceptors.response.use(
  async (response) => {
    // DeviseTokenAuth rotates the token on each request — persist the new one.
    const accessToken = response.headers["access-token"];
    const client = response.headers["client"];
    const uid = response.headers["uid"];

    if (accessToken) await secureStorage.setItem("access-token", accessToken);
    if (client) await secureStorage.setItem("client", client);
    if (uid) await secureStorage.setItem("uid", uid);

    return response;
  },
  async (error) => {
    const httpStatus = error.response?.status;

    // Blocked (suspended/banned): drop the session and surface a notice so the
    // user is bounced to login and told why — even if they were banned mid-session.
    const blocked = blockedNoticeFromResponse(httpStatus, error.response?.data);
    if (blocked) {
      await secureStorage.clearAuthHeaders();
      useAuthStore.getState().clearUser();
      useAuthStore.getState().setBlockedNotice(blocked);
    } else if (httpStatus === 401) {
      await secureStorage.clearAuthHeaders();
    }

    return Promise.reject(error);
  }
);
