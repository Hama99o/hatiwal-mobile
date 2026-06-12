// src/utils/secure-storage.ts
// expo-secure-store has NO web implementation (its web build exports {}),
// so on web we fall back to localStorage. On native we use SecureStore.

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

const store = {
  async getItemAsync(key: string): Promise<string | null> {
    if (isWeb) {
      if (typeof localStorage === "undefined") return null;
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItemAsync(key: string, value: string): Promise<void> {
    if (isWeb) {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  async deleteItemAsync(key: string): Promise<void> {
    if (isWeb) {
      if (typeof localStorage === "undefined") return;
      localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

const AUTH_KEYS = ["access-token", "client", "uid", "token-type", "expiry"] as const;

export const secureStorage = {
  getAuthHeaders: async () => {
    const accessToken = await store.getItemAsync("access-token");
    const client = await store.getItemAsync("client");
    const uid = await store.getItemAsync("uid");
    const tokenType = await store.getItemAsync("token-type");

    if (!accessToken || !client || !uid) return null;

    return {
      "access-token": accessToken,
      client,
      uid,
      "token-type": tokenType || "Bearer",
    };
  },

  saveAuthHeaders: async (headers: Record<string, string>) => {
    for (const key of AUTH_KEYS) {
      const value = headers[key];
      if (value) {
        await store.setItemAsync(key, value);
      }
    }
  },

  clearAuthHeaders: async () => {
    for (const key of AUTH_KEYS) {
      await store.deleteItemAsync(key);
    }
  },

  // Generic aliases (used by http.ts interceptors)
  getItem: store.getItemAsync.bind(store),
  setItem: store.setItemAsync.bind(store),
  removeItem: store.deleteItemAsync.bind(store),
  getItemAsync: store.getItemAsync.bind(store),
  setItemAsync: store.setItemAsync.bind(store),
  deleteItemAsync: store.deleteItemAsync.bind(store),
};
