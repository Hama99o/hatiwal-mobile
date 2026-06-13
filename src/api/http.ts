import axios from "axios";
import { secureStorage } from "@/utils/secure-storage";

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api/v1";

export const http = axios.create({
  baseURL: BASE_URL,
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
    if (error.response?.status === 401) {
      await secureStorage.clearAuthHeaders();
    }
    return Promise.reject(error);
  }
);
