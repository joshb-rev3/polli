import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { createCheckoutSession } from "./stripe";
import { stripeConfigured } from "./supabase";

/**
 * Opens Stripe-hosted Checkout (test or live). Payment method choice happens on Stripe's page.
 */
export async function payWithStripe(opts: {
  nominationId: string;
  coverFees: boolean;
  note?: string;
  anonymous?: boolean;
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
    Platform.OS === "web" && typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("id") || ""
      : "";

  const successUrl =
    Platform.OS === "web"
      ? `${origin}/pay-complete?id=${encodeURIComponent(feedId)}`
      : Linking.createURL("pay-complete", { queryParams: { id: feedId } });

  const cancelUrl =
    Platform.OS === "web"
      ? `${origin}/checkout?id=${encodeURIComponent(feedId)}`
      : Linking.createURL("checkout", { queryParams: { id: feedId } });

  const { url } = await createCheckoutSession({
    ...opts,
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
