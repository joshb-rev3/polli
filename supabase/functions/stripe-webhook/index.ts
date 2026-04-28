// Stripe webhook: marks donations succeeded/failed, which bumps counters via the DB trigger.

import Stripe from "https://esm.sh/stripe@17.5.0?target=denonext";
import { adminClient } from "../_shared/supabase.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature") || "";
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, WEBHOOK_SECRET);
  } catch (e) {
    return new Response(`signature verification failed: ${(e as Error).message}`, { status: 400 });
  }

  const admin = adminClient();

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    await admin
      .from("donations")
      .update({ status: "succeeded" })
      .eq("stripe_payment_intent_id", pi.id);
  } else if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    await admin
      .from("donations")
      .update({ status: "failed" })
      .eq("stripe_payment_intent_id", pi.id);
  } else if (event.type === "account.updated") {
    const acct = event.data.object as Stripe.Account;
    // Mark nominee's connect_ready once charges + payouts are enabled
    if (acct.id) {
      const ready = Boolean(acct.charges_enabled && acct.payouts_enabled && acct.details_submitted);
      await admin.from("users").update({ connect_ready: ready }).eq("stripe_connect_id", acct.id);
    }
  }

  return new Response("ok", { status: 200 });
});
