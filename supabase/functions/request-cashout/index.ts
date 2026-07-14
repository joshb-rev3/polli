// Request a cashout of wallet balance to the user's Stripe Connect Express account.
// Flow: initiate_cashout (ledger debit) → Stripe Transfer → attach_cashout_transfer.
// On Transfer failure, reverse_cashout restores the wallet (append-only).
//
// Request: POST { amountCents?: number, idempotencyKey?: string }
//   amountCents omitted → cash out full balance
// Response: { payoutId, transferId, amountCents, balanceAfterCents }

import Stripe from "https://esm.sh/stripe@17.5.0?target=denonext";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { adminClient, userFromAuthHeader } from "../_shared/supabase.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const MIN_CASHOUT_CENTS = 100; // $1 minimum

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    if (req.method !== "POST") return err(405, "method_not_allowed");

    const user = await userFromAuthHeader(req);
    if (!user) return err(401, "unauthorized");

    const body = await req.json().catch(() => ({}));
    const requestedCents =
      typeof body.amountCents === "number" ? Math.floor(body.amountCents) : null;
    const clientKey =
      typeof body.idempotencyKey === "string" && body.idempotencyKey.length > 0
        ? body.idempotencyKey
        : null;

    const admin = adminClient();

    const { data: profile } = await admin
      .from("users")
      .select("id, stripe_connect_id, connect_ready, kyc_status")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_connect_id || !profile.connect_ready) {
      return err(409, "connect_onboarding_required");
    }

    // Ensure wallet row exists, then read balance
    await admin.rpc("ensure_wallet", { p_user_id: user.id });
    const { data: wallet } = await admin
      .from("wallets")
      .select("balance_cents")
      .eq("user_id", user.id)
      .single();

    const balance = wallet?.balance_cents ?? 0;
    const amountCents = requestedCents ?? balance;

    if (amountCents < MIN_CASHOUT_CENTS) {
      return err(400, `minimum_cashout_is_${MIN_CASHOUT_CENTS}`);
    }
    if (amountCents > balance) {
      return err(400, "insufficient_balance");
    }

    const idempotencyKey = clientKey ?? `cashout:${user.id}:${amountCents}:${crypto.randomUUID()}`;

    const { data: initiated, error: initErr } = await admin.rpc("initiate_cashout", {
      p_user_id: user.id,
      p_amount_cents: amountCents,
      p_idempotency_key: idempotencyKey,
      p_method: "standard",
      p_fee_cents: 0,
    });

    if (initErr) return err(500, initErr.message);
    if (!initiated?.ok) {
      const code = initiated?.error ?? "cashout_failed";
      const status = code === "insufficient_balance" ? 400 : 409;
      return err(status, code);
    }

    const payoutId = initiated.payout_id as string;

    // Idempotent re-entry: transfer already attached
    if (initiated.idempotent) {
      const { data: existing } = await admin
        .from("payouts")
        .select("id, stripe_transfer_id, status, amount_cents")
        .eq("id", payoutId)
        .single();
      if (existing?.stripe_transfer_id) {
        return json({
          payoutId: existing.id,
          transferId: existing.stripe_transfer_id,
          amountCents: existing.amount_cents,
          balanceAfterCents: initiated.balance_after_cents ?? balance - amountCents,
          status: existing.status,
          idempotent: true,
        });
      }
    }

    let transfer: Stripe.Transfer;
    try {
      transfer = await stripe.transfers.create(
        {
          amount: amountCents,
          currency: "usd",
          destination: profile.stripe_connect_id,
          description: "polli cashout",
          metadata: {
            polli_payout_id: payoutId,
            supabase_user_id: user.id,
          },
        },
        { idempotencyKey: `transfer:${idempotencyKey}` },
      );
    } catch (e) {
      const reason = (e as Error).message;
      await admin.rpc("reverse_cashout", {
        p_payout_id: payoutId,
        p_failure_reason: reason,
      });
      return err(502, `transfer_failed: ${reason}`);
    }

    const { data: attached, error: attachErr } = await admin.rpc("attach_cashout_transfer", {
      p_payout_id: payoutId,
      p_stripe_transfer_id: transfer.id,
      p_mark_paid: true,
    });

    if (attachErr || !attached?.ok) {
      console.error("attach_cashout_transfer failed after transfer", transfer.id, attachErr, attached);
      // Transfer already moved money — do not reverse wallet; flag for ops
      await admin
        .from("payouts")
        .update({
          stripe_transfer_id: transfer.id,
          status: "in_transit",
          failure_reason: "attach_failed_after_transfer",
        })
        .eq("id", payoutId);
    }

    return json({
      payoutId,
      transferId: transfer.id,
      amountCents,
      balanceAfterCents: initiated.balance_after_cents ?? balance - amountCents,
      status: attached?.status ?? "in_transit",
    });
  } catch (e) {
    return err(500, (e as Error).message);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
