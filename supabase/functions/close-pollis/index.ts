// Scheduled nightly: close Pollis whose window has expired.
// Payouts no longer auto-fire from Connect destination balances — funds credit
// recipient wallets via complete_donation(); recipients cash out when Connect-ready.
//
// Deploy + schedule with:
//   supabase functions deploy close-pollis
//   supabase functions schedule create close-pollis-nightly \
//     --function close-pollis --cron "0 3 * * *"   # 3am UTC daily

import { adminClient } from "../_shared/supabase.ts";

Deno.serve(async () => {
  const admin = adminClient();

  const { data: closed, error } = await admin
    .from("pollis")
    .update({ status: "closed" })
    .eq("status", "live")
    .lt("closes_at", new Date().toISOString())
    .select("id");

  if (error) {
    console.error("close-pollis failed:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(
    JSON.stringify({ closed: closed?.length ?? 0 }),
    { headers: { "Content-Type": "application/json" } },
  );
});
