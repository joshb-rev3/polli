// Creates a Stripe PaymentIntent for a $1 donation.
// Platform holds funds; recipient balance is credited to wallets via
// complete_donation() on payment_intent.succeeded (no destination charges).
//
// Request: POST { nominationId: string, note?: string, anonymous?: boolean, voiceKeepsake?: boolean }
// Response: { clientSecret, paymentIntentId, ephemeralKey, customer, publishableKey }

import Stripe from "https://esm.sh/stripe@17.5.0?target=denonext";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { adminClient, userFromAuthHeader } from "../_shared/supabase.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const YEAR_CAP_CENTS = 60000; // $600 silent cap per nominee per calendar year
const GIFT_CENTS = 100;
const FEE_CENTS = 43;
const PLATFORM_FEE_CENTS = 10;
const KEEPSAKE_CENTS = 100;

function truthyFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    const user = await userFromAuthHeader(req);
    if (!user) return jsonErr(401, "unauthorized");

    const admin = adminClient();

    // Ensure public.users row exists (trigger may lag on first sign-in)
    await admin.from("users").upsert(
      {
        id: user.id,
        email: user.email ?? null,
        display_name:
          (user.user_metadata?.full_name as string) ||
          (user.user_metadata?.name as string) ||
          user.email?.split("@")[0] ||
          null,
        first_name:
          (user.user_metadata?.first_name as string) ||
          String(user.user_metadata?.full_name || user.user_metadata?.name || "").split(" ")[0] ||
          null,
      },
      { onConflict: "id" },
    );
    try {
      await admin.rpc("ensure_wallet", { p_user_id: user.id });
    } catch {
      // wallet may already exist; donations still proceed
    }

    const { nominationId, note, anonymous = false, voiceKeepsake = false } = await req.json();
    if (!nominationId) return jsonErr(400, "nominationId required");

    // Fees are always covered so the nominee receives the full $1.
    const coverFees = true;

    let nom: {
      id: string;
      nominee_id: string | null;
      nominee_first: string;
      nominator_id: string;
      status: string;
      closes_at: string;
      voice_keepsake?: boolean | null;
    } | null = null;

    {
      const primary = await admin
        .from("nominations")
        .select("id, nominee_id, nominee_first, nominator_id, status, closes_at, voice_keepsake")
        .eq("id", nominationId)
        .single();
      if (!primary.error && primary.data) {
        nom = primary.data;
      } else if (primary.error?.message && /voice_keepsake|schema cache/i.test(primary.error.message)) {
        const legacy = await admin
          .from("nominations")
          .select("id, nominee_id, nominee_first, nominator_id, status, closes_at")
          .eq("id", nominationId)
          .single();
        if (!legacy.error && legacy.data) nom = { ...legacy.data, voice_keepsake: false };
      }
    }
    if (!nom) return jsonErr(404, "nomination not found");
    if (nom.status !== "live") return jsonErr(400, "nomination not accepting donations");
    if (new Date(nom.closes_at).getTime() < Date.now()) {
      return jsonErr(400, "nomination closed");
    }
    if (nom.nominee_id && nom.nominee_id === user.id) {
      return jsonErr(400, "you can't donate to your own nomination");
    }

    // One $1 gift per donor per nomination (DB also enforces via partial unique index)
    const { data: existing } = await admin
      .from("donations")
      .select("id, status, stripe_payment_intent_id")
      .eq("nomination_id", nominationId)
      .eq("donor_id", user.id)
      .in("status", ["pending", "succeeded"])
      .maybeSingle();

    if (existing?.status === "succeeded") {
      return jsonErr(409, "you've already donated to this nomination");
    }

    // Resume an in-flight PaymentIntent, or release a stale pending row so retry can proceed
    if (existing?.status === "pending" && existing.stripe_payment_intent_id) {
      const intent = await stripe.paymentIntents.retrieve(existing.stripe_payment_intent_id);
      const resumable = ["requires_payment_method", "requires_confirmation", "requires_action"].includes(
        intent.status,
      );
      if (resumable) {
        const { data: donorRow } = await admin
          .from("users")
          .select("stripe_customer_id")
          .eq("id", user.id)
          .single();
        const customerId = donorRow?.stripe_customer_id;
        if (!customerId) return jsonErr(500, "missing stripe customer for pending donation");
        const ephemeralKey = await stripe.ephemeralKeys.create(
          { customer: customerId },
          { apiVersion: "2024-12-18.acacia" },
        );
        return new Response(
          JSON.stringify({
            clientSecret: intent.client_secret,
            paymentIntentId: intent.id,
            ephemeralKey: ephemeralKey.secret,
            customer: customerId,
            publishableKey: Deno.env.get("STRIPE_PUBLISHABLE_KEY"),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (intent.status === "succeeded") {
        // Webhook may lag; complete now
        await admin.rpc("complete_donation", { p_donation_id: existing.id });
        return jsonErr(409, "you've already donated to this nomination");
      }
      // canceled / expired / etc. — free the unique slot for a fresh attempt
      await admin
        .from("donations")
        .update({ status: "failed", failure_reason: `stale_intent:${intent.status}` })
        .eq("id", existing.id)
        .eq("status", "pending");
    }

    const isNominatorKickoff = nom.nominator_id === user.id;
    const chargeKeepsake =
      truthyFlag(voiceKeepsake) || (isNominatorKickoff && Boolean(nom.voice_keepsake));
    const keepsakeCents = chargeKeepsake ? KEEPSAKE_CENTS : 0;
    const netCents = GIFT_CENTS;
    const totalCents = GIFT_CENTS + FEE_CENTS + keepsakeCents;
    const platformFeeCents = PLATFORM_FEE_CENTS;

    // Silent $600/yr cap via recipient_annual_totals
    if (nom.nominee_id) {
      const curYear = new Date().getFullYear();
      const { data: annual } = await admin
        .from("recipient_annual_totals")
        .select("total_received_cents")
        .eq("recipient_id", nom.nominee_id)
        .eq("calendar_year", curYear)
        .maybeSingle();
      const ytd = annual?.total_received_cents ?? 0;
      if (ytd + netCents > YEAR_CAP_CENTS) {
        return jsonErr(
          409,
          `${nom.nominee_first} has already fully bloomed this year — pick another nominee.`,
        );
      }
    }

    // Donor Stripe Customer (lazy-create)
    const { data: donor } = await admin
      .from("users")
      .select("id, stripe_customer_id, first_name, email")
      .eq("id", user.id)
      .single();
    let customerId = donor?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: donor?.email ?? user.email ?? undefined,
        name: donor?.first_name ?? user.user_metadata?.name ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await admin.from("users").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    const idempotencyKey = `donation:${user.id}:${nominationId}:${crypto.randomUUID()}`;

    // Platform charge only — wallet ledger credits on webhook via complete_donation()
    const intent = await stripe.paymentIntents.create(
      {
        amount: totalCents,
        currency: "usd",
        customer: customerId,
        automatic_payment_methods: { enabled: true },
        description: chargeKeepsake
          ? `polli donation + voice keepsake for ${nom.nominee_first}`
          : `polli donation to ${nom.nominee_first}`,
        metadata: {
          nomination_id: nominationId,
          donor_id: user.id,
          cover_fees: coverFees ? "1" : "0",
          net_to_nominee_cents: String(netCents),
          voice_keepsake: chargeKeepsake ? "1" : "0",
          note: note ?? "",
          anonymous: anonymous ? "1" : "0",
        },
      },
      { idempotencyKey },
    );

    const { error: insertErr } = await admin.from("donations").insert({
      nomination_id: nominationId,
      donor_id: user.id,
      recipient_id: nom.nominee_id,
      fee_covered: coverFees,
      total_charged_cents: totalCents,
      net_to_nominee_cents: netCents,
      platform_fee_cents: platformFeeCents,
      stripe_payment_intent_id: intent.id,
      status: "pending",
      note: note || null,
      anonymous,
      idempotency_key: idempotencyKey,
    });

    if (insertErr) {
      // Unique violation = already donated / pending (race)
      if (insertErr.code === "23505") {
        return jsonErr(409, "you've already donated to this nomination");
      }
      return jsonErr(500, insertErr.message);
    }

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: "2024-12-18.acacia" },
    );

    return new Response(
      JSON.stringify({
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        ephemeralKey: ephemeralKey.secret,
        customer: customerId,
        publishableKey: Deno.env.get("STRIPE_PUBLISHABLE_KEY"),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return jsonErr(500, (e as Error).message);
  }
});

function jsonErr(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
