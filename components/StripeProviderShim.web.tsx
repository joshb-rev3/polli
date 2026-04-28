import React from "react";

interface Props {
  publishableKey: string;
  children: React.ReactNode;
}

// Stripe React Native SDK isn't web-compatible. On web we simply pass through —
// real payments happen on iOS/Android.
export function StripeProviderShim({ children }: Props) {
  return <>{children}</>;
}
