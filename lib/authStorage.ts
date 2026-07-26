import { Platform } from "react-native";

/**
 * Auth storage for Supabase.
 * Web/SSR uses localStorage (never touches window during static export).
 * Native lazily loads AsyncStorage so the web SSR bundle never evaluates it.
 */
const memory = new Map<string, string>();

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const webAuthStorage = {
  getItem(key: string): string | null {
    const store = browserStorage();
    if (!store) return memory.get(key) ?? null;
    return store.getItem(key);
  },
  setItem(key: string, value: string): void {
    const store = browserStorage();
    if (!store) {
      memory.set(key, value);
      return;
    }
    store.setItem(key, value);
  },
  removeItem(key: string): void {
    const store = browserStorage();
    if (!store) {
      memory.delete(key);
      return;
    }
    store.removeItem(key);
  },
};

type AuthStorage = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
};

function createAuthStorage(): AuthStorage {
  if (Platform.OS === "web") return webAuthStorage;
  // Dynamic require keeps AsyncStorage out of the web SSR evaluation path.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@react-native-async-storage/async-storage").default as AuthStorage;
}

export const authStorage = createAuthStorage();
