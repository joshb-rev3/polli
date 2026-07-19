import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import "react-native-url-polyfill/auto";

const url =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  (Constants.expoConfig?.extra as any)?.supabaseUrl ||
  "";
const anonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  (Constants.expoConfig?.extra as any)?.supabaseAnonKey ||
  "";

function looksConfigured(value: string) {
  const v = value.trim();
  if (!v) return false;
  const lower = v.toLowerCase();
  if (lower === "xxx" || lower === "xx" || lower.includes("your_project") || lower.includes("replace")) {
    return false;
  }
  return true;
}

export const supabase = createClient(url || "https://placeholder.supabase.co", anonKey || "placeholder", {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** True only when real URL + anon key are present (rejects xxx placeholders). */
export const supabaseConfigured = looksConfigured(url) && looksConfigured(anonKey);

export const stripePublishableKey =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  (Constants.expoConfig?.extra as any)?.stripePublishableKey ||
  "";

export const stripeConfigured =
  looksConfigured(stripePublishableKey) && stripePublishableKey.startsWith("pk_test_");
