import { supabase, supabaseConfigured } from "./supabase";

export interface WalletSummary {
  balanceCents: number;
  lifetimeReceivedCents: number;
  lifetimeCashedOutCents: number;
  connectReady: boolean;
  hasConnectAccount: boolean;
}

export interface CashoutResult {
  payoutId: string;
  transferId: string;
  amountCents: number;
  balanceAfterCents: number;
  status: string;
  idempotent?: boolean;
}

export async function fetchWallet(userId: string): Promise<WalletSummary | null> {
  if (!supabaseConfigured) return null;

  const [{ data: wallet }, { data: profile }] = await Promise.all([
    supabase
      .from("wallets")
      .select("balance_cents, lifetime_received_cents, lifetime_cashed_out_cents")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("users")
      .select("stripe_connect_id, connect_ready")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  return {
    balanceCents: wallet?.balance_cents ?? 0,
    lifetimeReceivedCents: wallet?.lifetime_received_cents ?? 0,
    lifetimeCashedOutCents: wallet?.lifetime_cashed_out_cents ?? 0,
    connectReady: Boolean(profile?.connect_ready),
    hasConnectAccount: Boolean(profile?.stripe_connect_id),
  };
}

export async function requestCashout(opts?: {
  amountCents?: number;
  idempotencyKey?: string;
}): Promise<CashoutResult> {
  if (!supabaseConfigured) throw new Error("Supabase not configured");
  const { data, error } = await supabase.functions.invoke("request-cashout", {
    body: opts ?? {},
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as CashoutResult;
}
