// Scheduled nightly: close any nomination whose window has expired,
// and trigger a Stripe Connect payout to the nominee's connected account.
//
// Deploy + schedule with:
//   supabase functions deploy close-nominations
//   supabase functions schedule create close-nominations-nightly \
//     --function close-nominations --cron "0 3 * * *"   # 3am UTC daily

import Stripe from "https://esm.sh/stripe@17.5.0?target=denonext";
import { adminClient } from "../_shared/supabase.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async () => {
  const admin = adminClient();

  // Flip expired live nominations to closed
  await admin
    .from("nominations")
    .update({ status: "closed" })
    .eq("status", "live")
    .lt("closes_at", new Date().toISOString());

  // Find closed nominations with a connected nominee and trigger a payout
  const { data: ready } = await admin
    .from("nominations")
    .select("id, raised_cents, nominee_id")
    .eq("status", "closed")
    .is("paid_out_at", null)
    .gt("raised_cents", 0);

  for (const n of ready ?? []) {
    if (!n.nominee_id) continue;
    const { data: nominee } = await admin
      .from("users")
      .select("stripe_connect_id, connect_ready")
      .eq("id", n.nominee_id)
      .single();
    if (!nominee?.stripe_connect_id || !nominee.connect_ready) continue;

    try {
      // Connect Express auto-payouts are enabled by default, but we force one here to accelerate.
      const payout = await stripe.payouts.create(
        { amount: n.raised_cents, currency: "usd" },
        { stripeAccount: nominee.stripe_connect_id }
      );
      await admin
        .from("nominations")
        .update({
          status: "paid_out",
          paid_out_at: new Date().toISOString(),
          payout_amount_cents: n.raised_cents,
        })
        .eq("id", n.id);
    } catch (e) {
      console.error(`payout failed for nomination ${n.id}:`, e);
    }
  }

  return new Response("ok");
});
