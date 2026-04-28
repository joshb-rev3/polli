import { StripeProvider } from "@stripe/stripe-react-native";
import React, { ReactElement } from "react";

interface Props {
  publishableKey: string;
  children: ReactElement | ReactElement[];
}

export function StripeProviderShim({ publishableKey, children }: Props) {
  return (
    <StripeProvider
      publishableKey={publishableKey}
      merchantIdentifier="merchant.com.rev3labs.polli"
      urlScheme="polli"
    >
      {children}
    </StripeProvider>
  );
}
