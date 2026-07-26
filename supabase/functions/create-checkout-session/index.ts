// Creates a Stripe Checkout Session (hosted page) for web / sandbox testing.
// Same donation row model as create-payment-intent; webhook completes on
// checkout.session.completed (and payment_intent.succeeded as a backup).
//
// Request: POST { nominationId, note?, anonymous?, voiceKeepsake?, successUrl, cancelUrl }
// Response: { url, sessionId, donationId }

/// <reference path="../deno.d.ts" />

import Stripe from "https://esm.sh/stripe@17.5.0?target=denonext";
import { corsHeaders, handleCors, jsonError, jsonResponse } from "../_shared/cors.ts";
import { adminClient, userFromAuthHeader } from "../_shared/supabase.ts";

function stripeClient() {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set in Supabase secrets");
  return new Stripe(key, {
    apiVersion: "2024-12-18.acacia",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

const YEAR_CAP_CENTS = 60000;
const GIFT_CENTS = 100;
const FEE_CENTS = 43;
const PLATFORM_FEE_CENTS = 10;
const KEEPSAKE_CENTS = 100;

function truthyFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

type NominationRow = {
  id: string;
  nominee_id: string | null;
  nominee_first: string;
  nominator_id: string;
  status: string;
  closes_at: string;
  voice_keepsake?: boolean | null;
};

async function loadNomination(
  admin: ReturnType<typeof adminClient>,
  nominationId: string,
): Promise<{ nom: NominationRow | null; error: string | null }> {
  const withKeepsake = await admin
    .from("nominations")
    .select("id, nominee_id, nominee_first, nominator_id, status, closes_at, voice_keepsake")
    .eq("id", nominationId)
    .single();

  if (!withKeepsake.error && withKeepsake.data) {
    return { nom: withKeepsake.data as NominationRow, error: null };
  }

  const msg = withKeepsake.error?.message ?? "";
  if (/voice_keepsake|schema cache/i.test(msg)) {
    const legacy = await admin
      .from("nominations")
      .select("id, nominee_id, nominee_first, nominator_id, status, closes_at")
      .eq("id", nominationId)
      .single();
    if (!legacy.error && legacy.data) {
      return { nom: { ...(legacy.data as NominationRow), voice_keepsake: false }, error: null };
    }
    return { nom: null, error: legacy.error?.message ?? "nomination not found" };
  }

  return { nom: null, error: withKeepsake.error?.message ?? "nomination not found" };
}

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    const user = await userFromAuthHeader(req);
    if (!user) return jsonError(401, "unauthorized");

    const stripe = stripeClient();
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
      /* ignore */
    }

    const {
      nominationId,
      note,
      anonymous = false,
      voiceKeepsake = false,
      successUrl,
      cancelUrl,
    } = await req.json();

    if (!nominationId) return jsonError(400, "nominationId required");
    if (!successUrl || !cancelUrl) return jsonError(400, "successUrl and cancelUrl required");

    // Fees are always covered so the nominee receives the full $1.
    const coverFees = true;

    const { nom, error: nomLoadErr } = await loadNomination(admin, nominationId);
    if (!nom) return jsonError(404, nomLoadErr ?? "nomination not found");
    if (nom.status !== "live") return jsonError(400, "nomination not accepting donations");
    if (new Date(nom.closes_at).getTime() < Date.now()) {
      return jsonError(400, "nomination closed");
    }
    // Nominee can't pile on their own campaign. Nominator kickoff is allowed
    // (nominee_id is usually null until they claim the Polli).
    if (nom.nominee_id && nom.nominee_id === user.id) {
      return jsonError(400, "you can't donate to your own nomination");
    }

    const { data: existing } = await admin
      .from("donations")
      .select("id, status")
      .eq("nomination_id", nominationId)
      .eq("donor_id", user.id)
      .in("status", ["pending", "succeeded"])
      .maybeSingle();

    if (existing?.status === "succeeded") {
      return jsonError(409, "you've already donated to this nomination");
    }
    if (existing?.status === "pending") {
      await admin
        .from("donations")
        .update({ status: "failed", failure_reason: "superseded_by_checkout" })
        .eq("id", existing.id)
        .eq("status", "pending");
    }

    // Voice keepsake is a nominator kickoff add-on (+$1). Prefer the persisted
    // nomination flag so launch can't accidentally omit it from Stripe.
    const isNominatorKickoff = nom.nominator_id === user.id;
    const chargeKeepsake =
      truthyFlag(voiceKeepsake) || (isNominatorKickoff && Boolean(nom.voice_keepsake));
    const keepsakeCents = chargeKeepsake ? KEEPSAKE_CENTS : 0;
    const netCents = GIFT_CENTS;
    const feeCents = FEE_CENTS;
    const totalCents = GIFT_CENTS + feeCents + keepsakeCents;
    const platformFeeCents = PLATFORM_FEE_CENTS;

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
        return jsonError(
          409,
          `${nom.nominee_first} has already fully bloomed this year — pick another nominee.`,
        );
      }
    }

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

    const idempotencyKey = `donation_checkout:${user.id}:${nominationId}:${crypto.randomUUID()}`;

    const { data: donation, error: insertErr } = await admin
      .from("donations")
      .insert({
        nomination_id: nominationId,
        donor_id: user.id,
        recipient_id: nom.nominee_id,
        fee_covered: coverFees,
        total_charged_cents: totalCents,
        net_to_nominee_cents: netCents,
        platform_fee_cents: platformFeeCents,
        stripe_payment_intent_id: null,
        status: "pending",
        note: note || null,
        anonymous,
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();

    if (insertErr || !donation) {
      if (insertErr?.code === "23505") {
        return jsonError(409, "you've already donated to this nomination");
      }
      return jsonError(500, insertErr?.message ?? "failed to create donation");
    }

    const giftUnitAmount = GIFT_CENTS + feeCents;
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: giftUnitAmount,
          product_data: {
            name: `polli gift for ${nom.nominee_first}`,
            description: "$1 to nominee (fees covered)",
          },
        },
      },
    ];
    if (keepsakeCents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: keepsakeCents,
          product_data: {
            name: "Voice keepsake",
            description: "Private voice note keepsake for the nominee",
          },
        },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      client_reference_id: donation.id,
      success_url: successUrl.includes("{CHECKOUT_SESSION_ID}")
        ? successUrl
        : `${successUrl}${successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      line_items: lineItems,
      payment_intent_data: {
        description: chargeKeepsake
          ? `polli donation + voice keepsake for ${nom.nominee_first}`
          : `polli donation to ${nom.nominee_first}`,
        metadata: {
          nomination_id: nominationId,
          donor_id: user.id,
          donation_id: donation.id,
          cover_fees: coverFees ? "1" : "0",
          net_to_nominee_cents: String(netCents),
          voice_keepsake: chargeKeepsake ? "1" : "0",
          note: note ?? "",
          anonymous: anonymous ? "1" : "0",
        },
      },
      metadata: {
        nomination_id: nominationId,
        donor_id: user.id,
        donation_id: donation.id,
        voice_keepsake: chargeKeepsake ? "1" : "0",
      },
    });

    if (!session.url) return jsonError(500, "Stripe did not return a checkout URL");

    return jsonResponse({
      url: session.url,
      sessionId: session.id,
      donationId: donation.id,
      publishableKey: Deno.env.get("STRIPE_PUBLISHABLE_KEY"),
    });
  } catch (e) {
    return jsonError(500, (e as Error).message);
  }
});
