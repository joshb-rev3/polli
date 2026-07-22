import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { createCheckoutSession } from "./stripe";
import { stripeConfigured } from "./supabase";

function webUrl(origin: string, path: string, query?: Record<string, string>) {
  const qs = query
    ? `?${Object.entries(query)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&")}`
    : "";
  return `${origin}/${path}${qs}`;
}

/**
 * Opens Stripe-hosted Checkout (test or live). Payment method choice happens on Stripe's page.
 */
export async function payWithStripe(opts: {
  nominationId: string;
  coverFees: boolean;
  note?: string;
  anonymous?: boolean;
  /** Optional $1 voice keepsake line item (nominate Speak mode). */
  voiceKeepsake?: boolean;
  /** Feed / mock id used in return URLs (pile-on flow). */
  returnId?: string;
  /** Where Stripe sends the donor after success (defaults to pay-complete). */
  successPath?: "pay-complete" | "launch-complete";
  /** Where Stripe sends the donor on cancel (defaults to checkout). */
  cancelPath?: string;
}): Promise<"succeeded" | "canceled"> {
  if (!stripeConfigured) {
    throw new Error(
      "Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_… to .env (Stripe Dashboard → Test mode) and restart Expo.",
    );
  }

  const origin =
    Platform.OS === "web" && typeof window !== "undefined"
      ? window.location.origin
      : Linking.createURL("/");

  const feedId =
    opts.returnId ??
    (Platform.OS === "web" && typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("id") || ""
      : "");

  const successPath = opts.successPath ?? "pay-complete";
  const cancelPath = opts.cancelPath ?? "checkout";
  const idQuery = feedId ? { id: feedId } : undefined;

  const successUrl =
    Platform.OS === "web"
      ? webUrl(origin, successPath, idQuery)
      : Linking.createURL(successPath, idQuery ? { queryParams: idQuery } : undefined);

  const cancelQuery =
    cancelPath === "checkout" && feedId ? { id: feedId } : undefined;
  const cancelUrl =
    Platform.OS === "web"
      ? webUrl(origin, cancelPath, cancelQuery)
      : Linking.createURL(
          cancelPath,
          cancelQuery ? { queryParams: cancelQuery } : undefined,
        );

  const { url } = await createCheckoutSession({
    nominationId: opts.nominationId,
    coverFees: opts.coverFees,
    note: opts.note,
    anonymous: opts.anonymous,
    voiceKeepsake: opts.voiceKeepsake,
    successUrl,
    cancelUrl,
  });

  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.location.assign(url);
  } else {
    const opened = await Linking.openURL(url);
    if (!opened) throw new Error("Could not open Stripe Checkout");
  }

  return "succeeded";
}
