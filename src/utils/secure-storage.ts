import * as SecureStore from "expo-secure-store";

const store = {
  getItemAsync: (key: string) => SecureStore.getItemAsync(key),
  setItemAsync: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  deleteItemAsync: (key: string) => SecureStore.deleteItemAsync(key),
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
