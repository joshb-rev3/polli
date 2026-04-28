import { initPaymentSheet, presentPaymentSheet } from "@stripe/stripe-react-native";
import { createPaymentIntent } from "./stripe";

export async function payWithStripe(opts: {
  nominationId: string;
  coverFees: boolean;
  note?: string;
  anonymous?: boolean;
}): Promise<"succeeded" | "canceled"> {
  const intent = await createPaymentIntent(opts);
  const init = await initPaymentSheet({
    merchantDisplayName: "polli",
    paymentIntentClientSecret: intent.clientSecret,
    customerId: intent.customer,
    customerEphemeralKeySecret: intent.ephemeralKey,
    applePay: { merchantCountryCode: "US" },
    googlePay: { merchantCountryCode: "US", testEnv: true, currencyCode: "USD" },
    allowsDelayedPaymentMethods: false,
    style: "automatic",
  });
  if (init.error) throw new Error(init.error.message);
  const present = await presentPaymentSheet();
  if (present.error) {
    if (present.error.code === "Canceled") return "canceled";
    throw new Error(present.error.message);
  }
  return "succeeded";
}
