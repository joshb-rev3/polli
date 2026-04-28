// Lazy-creates a Stripe Connect Express account for the current user and
// returns a hosted AccountLink URL they open to complete onboarding (KYC + bank).
// The app opens this in a WebBrowser session.

import Stripe from "https://esm.sh/stripe@17.5.0?target=denonext";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { adminClient, userFromAuthHeader } from "../_shared/supabase.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    const user = await userFromAuthHeader(req);
    if (!user) return err(401, "unauthorized");

    const admin = adminClient();
    const { data: profile } = await admin
      .from("users")
      .select("id, email, stripe_connect_id, first_name, last_name")
      .eq("id", user.id)
      .single();

    let accountId = profile?.stripe_connect_id;
    if (!accountId) {
      const acct = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: profile?.email ?? user.email ?? undefined,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: false },
        },
        business_type: "individual",
        metadata: { supabase_user_id: user.id },
      });
      accountId = acct.id;
      await admin.from("users").update({ stripe_connect_id: accountId }).eq("id", user.id);
    }

    const deepLink = Deno.env.get("APP_DEEP_LINK") || "polli://";
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${deepLink}connect-refresh`,
      return_url: `${deepLink}connect-return`,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: link.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return err(500, (e as Error).message);
  }
});

function err(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
