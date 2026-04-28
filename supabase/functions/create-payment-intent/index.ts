// Creates a Stripe PaymentIntent for a $1 donation.
// Uses a "destination charge" with application_fee_amount so the nominee's
// Connect Express account accrues the net amount automatically.
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

    // Load nomination + nominee
    const { data: nom, error: nomErr } = await admin
      .from("nominations")
      .select("id, nominee_id, nominee_first, status, closes_at")
      .eq("id", nominationId)
      .single();
    if (nomErr || !nom) return jsonErr(404, "nomination not found");
    if (nom.status !== "live") return jsonErr(400, "nomination not accepting donations");
    if (new Date(nom.closes_at).getTime() < Date.now())
      return jsonErr(400, "nomination closed");

    const netCents = coverFees ? 100 : 57;
    const totalCents = coverFees ? 143 : 100;
    const platformFeeCents = coverFees ? 10 : 7; // polli's ~$0.10 cut; remainder goes to Stripe fees

    // Silent $600/yr cap check against the nominee's YTD
    if (nom.nominee_id) {
      const { data: nominee } = await admin
        .from("users")
        .select("ytd_received_cents, ytd_year, stripe_connect_id")
        .eq("id", nom.nominee_id)
        .single();
      const curYear = new Date().getFullYear();
      const ytd = nominee?.ytd_year === curYear ? nominee.ytd_received_cents : 0;
      if (ytd + netCents > YEAR_CAP_CENTS) {
        return jsonErr(
          409,
          `${nom.nominee_first} has already fully bloomed this year — pick another nominee.`
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

    // Build PaymentIntent. If nominee has a connect account, use a destination charge.
    const baseParams: Stripe.PaymentIntentCreateParams = {
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
    };

    if (nom.nominee_id) {
      const { data: nominee } = await admin
        .from("users")
        .select("stripe_connect_id, connect_ready")
        .eq("id", nom.nominee_id)
        .single();
      if (nominee?.stripe_connect_id && nominee.connect_ready) {
        baseParams.transfer_data = { destination: nominee.stripe_connect_id, amount: netCents };
        baseParams.application_fee_amount = totalCents - netCents;
      }
    }

    const intent = await stripe.paymentIntents.create(baseParams);

    // Insert the pending donation row so we can reconcile on webhook
    await admin.from("donations").insert({
      nomination_id: nominationId,
      donor_id: user.id,
      fee_covered: coverFees,
      total_charged_cents: totalCents,
      net_to_nominee_cents: netCents,
      platform_fee_cents: platformFeeCents,
      stripe_payment_intent_id: intent.id,
      status: "pending",
      note: note || null,
      anonymous,
    });

    // Ephemeral key so the native PaymentSheet can attach new payment methods to this customer
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: "2024-12-18.acacia" }
    );

    return new Response(
      JSON.stringify({
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        ephemeralKey: ephemeralKey.secret,
        customer: customerId,
        publishableKey: Deno.env.get("STRIPE_PUBLISHABLE_KEY"),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
