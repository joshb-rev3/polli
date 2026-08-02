import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, supabaseConfigured } from "./supabase";

const DEMO_PROMPTED_KEY = "polli.home_area_prompted";

export type HomeArea = {
  zip?: string;
  city?: string;
  region?: string;
};

function cleanCity(raw: string) {
  return raw.trim().replace(/\s+/g, " ").slice(0, 80);
}

function cleanRegion(raw: string) {
  return raw.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
}

function cleanZip(raw: string) {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, "");
  const us = cleaned.match(/^(\d{5})(?:-?\d{4})?$/);
  if (us) return us[1];
  // Light allow for non-US postal codes entered manually
  return cleaned.replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

/** True when we have not yet asked this user for home area (or they never skipped/saved). */
export async function needsHomeAreaPrompt(userId: string | null): Promise<boolean> {
  if (!userId) return false;

  if (!supabaseConfigured || userId.startsWith("local-demo")) {
    const v = await AsyncStorage.getItem(`${DEMO_PROMPTED_KEY}.${userId}`);
    return !v;
  }

  const { data, error } = await supabase
    .from("users")
    .select("home_area_prompted_at, home_zip, home_city, home_region")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("needsHomeAreaPrompt:", error.message);
    return false;
  }
  if (data?.home_area_prompted_at) return false;
  // Already have a signal (e.g. Stripe ZIP) — no need to re-ask.
  if (data?.home_zip || (data?.home_city && data?.home_region)) return false;
  return true;
}

export async function saveHomeArea(
  userId: string | null,
  area: HomeArea,
): Promise<void> {
  if (!userId) return;

  const zip = area.zip ? cleanZip(area.zip) : "";
  const city = area.city ? cleanCity(area.city) : "";
  const region = area.region ? cleanRegion(area.region) : "";

  const hasZip = Boolean(zip);
  const hasCityState = Boolean(city && region.length === 2);
  if (!hasZip && !hasCityState) {
    throw new Error("Enter a ZIP code (or city and state).");
  }

  if (!supabaseConfigured || userId.startsWith("local-demo")) {
    await AsyncStorage.setItem(
      `${DEMO_PROMPTED_KEY}.${userId}`,
      JSON.stringify({ zip: zip || undefined, city: city || undefined, region: region || undefined, at: Date.now() }),
    );
    return;
  }

  const row: Record<string, string> = {
    id: userId,
    home_area_prompted_at: new Date().toISOString(),
  };
  if (hasZip) row.home_zip = zip;
  if (city) row.home_city = city;
  if (region.length === 2) row.home_region = region;

  const { error } = await supabase.from("users").upsert(row, { onConflict: "id" });

  if (error) throw new Error(error.message);
}

/** Mark prompted without saving a location (Skip). */
export async function skipHomeArea(userId: string | null): Promise<void> {
  if (!userId) return;

  if (!supabaseConfigured || userId.startsWith("local-demo")) {
    await AsyncStorage.setItem(`${DEMO_PROMPTED_KEY}.${userId}`, "skipped");
    return;
  }

  const { error } = await supabase
    .from("users")
    .upsert(
      {
        id: userId,
        home_area_prompted_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (error) throw new Error(error.message);
}
