// Scheduled nightly: close nominations whose window has expired.
// Payouts no longer auto-fire from Connect destination balances — funds credit
// recipient wallets via complete_donation(); nominees cash out when Connect-ready.
//
// Deploy + schedule with:
//   supabase functions deploy close-nominations
//   supabase functions schedule create close-nominations-nightly \
//     --function close-nominations --cron "0 3 * * *"   # 3am UTC daily

import { adminClient } from "../_shared/supabase.ts";

Deno.serve(async () => {
  const admin = adminClient();

  const { data: closed, error } = await admin
    .from("nominations")
    .update({ status: "closed" })
    .eq("status", "live")
    .lt("closes_at", new Date().toISOString())
    .select("id");

  if (error) {
    console.error("close-nominations failed:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(
    JSON.stringify({ closed: closed?.length ?? 0 }),
    { headers: { "Content-Type": "application/json" } },
  );
});
