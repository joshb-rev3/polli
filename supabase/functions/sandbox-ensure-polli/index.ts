// Sandbox helper: turns a mock feed key (n1…) into a real live Polli row
// so Stripe Checkout has a valid FK target for gift flow testing.
//
// POST { feedKey, recipientFirst, recipientLast, catId, story, timelineDays? }
// → { polliId, slug, created }
//
// Note: starter_id is the signed-in user (FK to auth.users). Checkout must pass
// intent: "gift" so Stripe copy treats this as chipping in, not starting a Polli.

import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { adminClient, userFromAuthHeader } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    const user = await userFromAuthHeader(req);
    if (!user) return jsonErr(401, "Sign in to give.");

    const body = await req.json();
    const feedKey = String(body.feedKey || "").trim();
    const recipientFirst = String(body.recipientFirst || "").trim();
    const recipientLast = String(body.recipientLast || "").trim() || "Friend";
    const catId = String(body.catId || "just-because");
    const story = String(body.story || "A Polli shared from the feed.");
    const timelineDays = Number(body.timelineDays) || 14;

    if (!feedKey || !recipientFirst) return jsonErr(400, "feedKey and recipientFirst required");

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
      .from("pollis")
      .select("id, slug, status, closes_at")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      const closed =
        existing.status !== "live" ||
        !existing.closes_at ||
        new Date(existing.closes_at).getTime() < Date.now();
      if (closed) {
        const { error: reopenErr } = await admin
          .from("pollis")
          .update({
            status: "live",
            closes_at: new Date(Date.now() + timelineDays * 86400000).toISOString(),
          })
          .eq("id", existing.id);
        if (reopenErr) return jsonErr(500, reopenErr.message);
      }
      return json({ polliId: existing.id, slug: existing.slug, created: false });
    }

    const { data: created, error } = await admin
      .from("pollis")
      .insert({
        slug,
        starter_id: user.id,
        recipient_first: recipientFirst,
        recipient_last: recipientLast,
        cat_id: catId,
        story,
        timeline_days: timelineDays,
        status: "live",
        closes_at: new Date(Date.now() + timelineDays * 86400000).toISOString(),
      })
      .select("id, slug")
      .single();

    if (error || !created) return jsonErr(500, error?.message ?? "failed to create Polli");

    return json({ polliId: created.id, slug: created.slug, created: true });
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
