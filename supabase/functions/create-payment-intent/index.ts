// Creates a Stripe PaymentIntent for a $1 donation.
// Platform holds funds; recipient balance is credited to wallets via
// complete_donation() on payment_intent.succeeded (no destination charges).
//
// Request: POST { nominationId: string, coverFees: boolean, note?: string, anonymous?: boolean }
// Response: { clientSecret, paymentIntentId, ephemeralKey, customer, publishableKey }

import Stripe from "https://esm.sh/stripe@17.5.0?target=denonext";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { adminClient, userFromAuthHeader } from "../_shared/supabase.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const YEAR_CAP_CENTS = 60000; // $600 silent cap per nominee per calendar year

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    const user = await userFromAuthHeader(req);
    if (!user) return jsonErr(401, "unauthorized");

    const { nominationId, coverFees = true, note, anonymous = false } = await req.json();
    if (!nominationId) return jsonErr(400, "nominationId required");

    const admin = adminClient();

    const { data: nom, error: nomErr } = await admin
      .from("nominations")
      .select("id, nominee_id, nominee_first, status, closes_at")
      .eq("id", nominationId)
      .single();
    if (nomErr || !nom) return jsonErr(404, "nomination not found");
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

    const netCents = coverFees ? 100 : 57;
    const totalCents = coverFees ? 143 : 100;
    const platformFeeCents = coverFees ? 10 : 7;

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
        description: `polli donation to ${nom.nominee_first}`,
        metadata: {
          nomination_id: nominationId,
          donor_id: user.id,
          cover_fees: coverFees ? "1" : "0",
          net_to_nominee_cents: String(netCents),
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
