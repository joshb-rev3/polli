// Stripe webhook: completes donations via complete_donation() (ledger + wallet),
// marks cashout transfer reversals, and syncs Connect KYC readiness.

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

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await onPaymentSucceeded(admin, event.data.object as Stripe.PaymentIntent);
        break;
      case "payment_intent.payment_failed":
        await onPaymentFailed(admin, event.data.object as Stripe.PaymentIntent);
        break;
      case "transfer.reversed":
        await onTransferReversed(admin, event.data.object as Stripe.Transfer);
        break;
      case "account.updated":
        await onAccountUpdated(admin, event.data.object as Stripe.Account);
        break;
      default:
        break;
    }
  } catch (e) {
    console.error(`webhook handler error for ${event.type}:`, e);
    return new Response(`handler error: ${(e as Error).message}`, { status: 500 });
  }

  return new Response("ok", { status: 200 });
});

async function onPaymentSucceeded(
  admin: ReturnType<typeof adminClient>,
  pi: Stripe.PaymentIntent,
) {
  const { data: donation } = await admin
    .from("donations")
    .select("id, status")
    .eq("stripe_payment_intent_id", pi.id)
    .maybeSingle();

  if (!donation) {
    console.error(`no donation for payment_intent ${pi.id}`);
    return;
  }
  if (donation.status === "succeeded") return;

  const { data: result, error } = await admin.rpc("complete_donation", {
    p_donation_id: donation.id,
  });
  if (error) throw error;
  if (result && result.ok === false) {
    console.error(`complete_donation rejected for ${donation.id}:`, result);
    if (result.error === "annual_cap_exceeded") {
      await admin
        .from("donations")
        .update({ failure_reason: "annual_cap_exceeded_post_capture" })
        .eq("id", donation.id);
      return;
    }
    throw new Error(`complete_donation rejected: ${result.error}`);
  }
}

async function onPaymentFailed(
  admin: ReturnType<typeof adminClient>,
  pi: Stripe.PaymentIntent,
) {
  await admin
    .from("donations")
    .update({
      status: "failed",
      failure_reason: pi.last_payment_error?.message ?? "payment_failed",
    })
    .eq("stripe_payment_intent_id", pi.id)
    .eq("status", "pending");
}

async function onTransferReversed(
  admin: ReturnType<typeof adminClient>,
  transfer: Stripe.Transfer,
) {
  const payoutId = transfer.metadata?.polli_payout_id;
  let payoutRow: { id: string } | null = null;

  if (payoutId) {
    const { data } = await admin.from("payouts").select("id").eq("id", payoutId).maybeSingle();
    payoutRow = data;
  }
  if (!payoutRow) {
    const { data } = await admin
      .from("payouts")
      .select("id")
      .eq("stripe_transfer_id", transfer.id)
      .maybeSingle();
    payoutRow = data;
  }
  if (!payoutRow) {
    console.error(`no payout for reversed transfer ${transfer.id}`);
    return;
  }

  const { data: result, error } = await admin.rpc("reverse_cashout", {
    p_payout_id: payoutRow.id,
    p_failure_reason: "stripe_transfer_reversed",
  });
  if (error) throw error;
  if (result && result.ok === false) {
    throw new Error(`reverse_cashout rejected: ${result.error}`);
  }
}

async function onAccountUpdated(
  admin: ReturnType<typeof adminClient>,
  acct: Stripe.Account,
) {
  if (!acct.id) return;
  const ready = Boolean(acct.charges_enabled && acct.payouts_enabled && acct.details_submitted);
  await admin
    .from("users")
    .update({
      connect_ready: ready,
      kyc_status: ready ? "verified" : acct.details_submitted ? "pending" : "unverified",
    })
    .eq("stripe_connect_id", acct.id);
}
