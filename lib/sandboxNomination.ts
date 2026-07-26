import { FunctionsHttpError } from "@supabase/supabase-js";
import type { FeedItem } from "./mockData";
import { supabase, supabaseConfigured } from "./supabase";

async function edgeErrorMessage(error: unknown, data: unknown): Promise<string> {
  if (data && typeof data === "object" && data !== null && "error" in data) {
    const msg = String((data as { error?: unknown }).error ?? "").trim();
    if (msg) return msg;
  }
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body && typeof body === "object" && "error" in body) {
        const msg = String((body as { error?: unknown }).error ?? "").trim();
        if (msg) return msg;
      }
    } catch {
      /* ignore */
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return "Could not prepare nomination for checkout";
}

/**
 * Resolves a feed item to a live nomination UUID Stripe can charge against.
 * Mock feed keys are upserted via the sandbox-ensure-nomination edge function.
 */
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

  if (error) throw new Error(await edgeErrorMessage(error, data));
  if (data?.error) throw new Error(String(data.error));
  if (!data?.nominationId) throw new Error("sandbox nomination missing id");
  return data.nominationId as string;
}
