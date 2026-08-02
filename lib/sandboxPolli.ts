import { FunctionsHttpError } from "@supabase/supabase-js";
import type { FeedItem } from "./mockData";
import { nameParts } from "./names";
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
  return "Could not prepare this Polli for checkout";
}

/**
 * Resolves a feed item to a live Polli UUID Stripe can charge against.
 * Mock feed keys are upserted via the sandbox-ensure-polli edge function.
 */
export async function ensureSandboxPolli(n: FeedItem): Promise<string> {
  if (!supabaseConfigured) return n.id;

  // Already a UUID from a live row
  if (/^[0-9a-f-]{36}$/i.test(n.id)) return n.id;

  const { first, last } = nameParts(n.name);
  const { data, error } = await supabase.functions.invoke("sandbox-ensure-polli", {
    body: {
      feedKey: n.id,
      recipientFirst: first || n.name,
      recipientLast: last || "Friend",
      catId: n.cat.id,
      story: n.story,
      timelineDays: Math.max(7, n.daysLeft || 7),
    },
  });

  if (error) throw new Error(await edgeErrorMessage(error, data));
  if (data?.error) throw new Error(String(data.error));
  if (!data?.polliId) throw new Error("Could not prepare this Polli for checkout");
  return data.polliId as string;
}
