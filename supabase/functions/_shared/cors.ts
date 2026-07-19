/** Shared CORS for browser calls from localhost / Netlify. */

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-api-version, prefer, accept, accept-profile, content-profile",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, PATCH, DELETE",
  "Access-Control-Max-Age": "86400",
};

/** Handle preflight; echo requested headers so supabase-js never trips CORS. */
export function handleCors(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;

  const requested = req.headers.get("Access-Control-Request-Headers");
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      ...(requested ? { "Access-Control-Allow-Headers": requested } : {}),
    },
  });
}

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function jsonError(status: number, message: string) {
  return jsonResponse({ error: message }, status);
}
