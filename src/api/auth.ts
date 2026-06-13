import { Platform } from "react-native";
import { http, BASE_URL } from "./http";
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
  avatarUrl: string | null;
  preferredLanguage: "en" | "ps" | "fa";
  preferredTheme: "light" | "dark" | "system";
  sellerMode: boolean;
  status: string;
  createdAt: string;
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

  me: async (): Promise<User> => {
    const response = await http.get("/users/me");
    return convertKeysToCamel(response.data.user) as User;
  },

  updateMe: async (data: Partial<User>): Promise<User> => {
    const response = await http.put("/users/me", { user: convertKeysToSnake(data) });
    return convertKeysToCamel(response.data.user) as User;
  },

  updateAvatar: async (uri: string): Promise<User> => {
    // Use native fetch — axios's default Content-Type: application/json causes
    // its transformRequest to JSON-serialize FormData, turning Blob into {}.
    // Native fetch passes FormData straight through and sets the correct
    // multipart/form-data boundary automatically.
    const form = new FormData();

    if (Platform.OS === "web") {
      const res = await fetch(uri);
      const blob = await res.blob();
      form.append("user[avatar]", blob, "avatar.jpg");
    } else {
      (form as any).append("user[avatar]", {
        uri,
        name: "avatar.jpg",
        type: "image/jpeg",
      });
    }

    const accessToken = await secureStorage.getItem("access-token");
    const client      = await secureStorage.getItem("client");
    const uid         = await secureStorage.getItem("uid");

    const res = await fetch(`${BASE_URL}/users/me`, {
      method: "PUT",
      body: form,
      headers: {
        "access-token": accessToken ?? "",
        client:         client ?? "",
        uid:            uid ?? "",
        "token-type":   "Bearer",
        // No Content-Type — fetch sets it with the correct boundary
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw Object.assign(new Error("avatar upload failed"), { response: { data: err } });
    }

    // Rotate auth tokens from response headers (DeviseTokenAuth)
    const newToken = res.headers.get("access-token");
    const newClient = res.headers.get("client");
    const newUid = res.headers.get("uid");
    if (newToken) await secureStorage.setItem("access-token", newToken);
    if (newClient) await secureStorage.setItem("client", newClient);
    if (newUid) await secureStorage.setItem("uid", newUid);

    const data = await res.json();
    return convertKeysToCamel(data.user) as User;
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
