// Sandbox helper: turns a mock feed key (n1…) into a real live nomination row
// so Stripe test-mode PaymentIntents have a valid FK target.
//
// POST { feedKey, nomineeFirst, nomineeLast, catId, story, timelineDays? }
// → { nominationId, slug, created }

import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { adminClient, userFromAuthHeader } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    const user = await userFromAuthHeader(req);
    if (!user) return jsonErr(401, "unauthorized");

    const body = await req.json();
    const feedKey = String(body.feedKey || "").trim();
    const nomineeFirst = String(body.nomineeFirst || "").trim();
    const nomineeLast = String(body.nomineeLast || "").trim() || "Friend";
    const catId = String(body.catId || "just-because");
    const story = String(body.story || "Sandbox nomination for Stripe test mode.");
    const timelineDays = Number(body.timelineDays) || 14;

    if (!feedKey || !nomineeFirst) return jsonErr(400, "feedKey and nomineeFirst required");

    const admin = adminClient();

    await admin.from("users").upsert(
      {
        id: user.id,
        email: user.email ?? null,
        display_name:
          (user.user_metadata?.full_name as string) ||
          (user.user_metadata?.name as string) ||
          user.email?.split("@")[0] ||
          null,
      },
      { onConflict: "id" },
    );

    const slug = `sandbox-${feedKey}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");

    const { data: existing } = await admin
      .from("nominations")
      .select("id, slug, status")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      if (existing.status !== "live") {
        await admin
          .from("nominations")
          .update({
            status: "live",
            closes_at: new Date(Date.now() + timelineDays * 86400000).toISOString(),
          })
          .eq("id", existing.id);
      }
      return json({ nominationId: existing.id, slug: existing.slug, created: false });
    }

    const { data: created, error } = await admin
      .from("nominations")
      .insert({
        slug,
        nominator_id: user.id,
        nominee_first: nomineeFirst,
        nominee_last: nomineeLast,
        cat_id: catId,
        story,
        timeline_days: timelineDays,
        status: "live",
        closes_at: new Date(Date.now() + timelineDays * 86400000).toISOString(),
      })
      .select("id, slug")
      .single();

    if (error || !created) return jsonErr(500, error?.message ?? "failed to create nomination");

    return json({ nominationId: created.id, slug: created.slug, created: true });
  } catch (e) {
    return jsonErr(500, (e as Error).message);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonErr(status: number, message: string) {
  return json({ error: message }, status);
}
