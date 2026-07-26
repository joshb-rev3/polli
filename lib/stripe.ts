import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./supabase";

export interface IntentResult {
  clientSecret: string;
  paymentIntentId: string;
  ephemeralKey: string;
  customer: string;
  publishableKey: string;
}

async function edgeErrorMessage(error: unknown, data: unknown): Promise<string> {
  if (data && typeof data === "object" && data !== null && "error" in data) {
    const msg = String((data as { error?: unknown }).error ?? "").trim();
    if (msg) return msg;
  }
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body && typeof body === "object" && "error" in body) {
        const msg = String((body as { error?: unknown }).error ?? "").trim();
        if (msg) return msg;
      }
    } catch {
      /* ignore */
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return "Request failed";
}

async function invokeEdge<T extends Record<string, unknown>>(
  name: string,
  body?: Record<string, unknown>,
): Promise<T> {
  if (!supabaseConfigured) throw new Error("Supabase not configured");
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw new Error(await edgeErrorMessage(error, data));
  if (data && typeof data === "object" && "error" in data && (data as { error?: unknown }).error) {
    throw new Error(String((data as { error: unknown }).error));
  }
  return data as T;
}

export async function createPaymentIntent(opts: {
  nominationId: string;
  note?: string;
  anonymous?: boolean;
  voiceKeepsake?: boolean;
}): Promise<IntentResult> {
  return invokeEdge<IntentResult>("create-payment-intent", { ...opts });
}

export async function getConnectOnboardingUrl(): Promise<string> {
  const data = await invokeEdge<{ url: string }>("connect-onboard", {});
  return data.url;
}

export async function createCheckoutSession(opts: {
  nominationId: string;
  note?: string;
  anonymous?: boolean;
  voiceKeepsake?: boolean;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; sessionId: string; donationId: string }> {
  const data = await invokeEdge<{
    url?: string;
    sessionId?: string;
    donationId?: string;
    error?: string;
  }>("create-checkout-session", { ...opts });
  if (!data?.url) throw new Error("No Stripe Checkout URL returned");
  return data as { url: string; sessionId: string; donationId: string };
}

export { fetchWallet, requestCashout } from "./wallet";
export type { CashoutResult, WalletSummary } from "./wallet";
