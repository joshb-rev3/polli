import { supabase, supabaseConfigured } from "./supabase";

export interface IntentResult {
  clientSecret: string;
  paymentIntentId: string;
  ephemeralKey: string;
  customer: string;
  publishableKey: string;
}

export async function createPaymentIntent(opts: {
  nominationId: string;
  coverFees: boolean;
  note?: string;
  anonymous?: boolean;
}): Promise<IntentResult> {
  if (!supabaseConfigured) throw new Error("Supabase not configured");
  const { data, error } = await supabase.functions.invoke("create-payment-intent", {
    body: opts,
  });
  if (error) throw error;
  return data as IntentResult;
}

export async function getConnectOnboardingUrl(): Promise<string> {
  if (!supabaseConfigured) throw new Error("Supabase not configured");
  const { data, error } = await supabase.functions.invoke("connect-onboard", {});
  if (error) throw error;
  return (data as { url: string }).url;
}

export { fetchWallet, requestCashout } from "./wallet";
export type { CashoutResult, WalletSummary } from "./wallet";
