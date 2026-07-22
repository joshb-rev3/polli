import type { NominationDraft } from "./nomination";
import { supabase, supabaseConfigured } from "./supabase";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "friend";
}

/**
 * Persists a live nomination from the nominate draft so Stripe can charge the kickoff gift.
 */
export async function createLiveNomination(draft: NominationDraft): Promise<{
  nominationId: string;
  slug: string;
}> {
  if (!supabaseConfigured) {
    throw new Error("Supabase not configured");
  }

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error("Sign in required to launch a Polli");

  const timelineDays = Number(draft.timeline) as 7 | 14 | 30;
  const baseSlug = slugify(`${draft.first}-${draft.last}`);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const { data, error } = await supabase
    .from("nominations")
    .insert({
      slug,
      nominator_id: user.id,
      nominee_first: draft.first.trim(),
      nominee_last: draft.last.trim() || "Friend",
      nominee_email: draft.email.trim() || null,
      nominee_phone: draft.phone.trim() || null,
      cat_id: draft.catId || "just-because",
      story: draft.overview.trim(),
      timeline_days: timelineDays,
      status: "live",
      closes_at: new Date(Date.now() + timelineDays * 86400000).toISOString(),
    })
    .select("id, slug")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create nomination");
  }

  return { nominationId: data.id as string, slug: data.slug as string };
}
