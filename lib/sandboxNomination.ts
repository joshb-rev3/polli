import { supabase, supabaseConfigured } from "./supabase";
import type { FeedItem } from "./mockData";

export async function ensureSandboxNomination(n: FeedItem): Promise<string> {
  if (!supabaseConfigured) return n.id;

  // Already a UUID from a live row
  if (/^[0-9a-f-]{36}$/i.test(n.id)) return n.id;

  const { data, error } = await supabase.functions.invoke("sandbox-ensure-nomination", {
    body: {
      feedKey: n.id,
      nomineeFirst: n.name.split(" ")[0] || n.name,
      nomineeLast: n.name.split(" ").slice(1).join(" ") || "Friend",
      catId: n.cat.id,
      story: n.story,
      timelineDays: Math.max(7, n.daysLeft || 7),
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.nominationId) throw new Error("sandbox nomination missing id");
  return data.nominationId as string;
}
