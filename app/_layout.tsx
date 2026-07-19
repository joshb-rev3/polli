import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
} from "@expo-google-fonts/figtree";
import {
  Fraunces_400Regular,
  Fraunces_400Regular_Italic,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from "@expo-google-fonts/fraunces";
import {
  Merriweather_700Bold,
  Merriweather_900Black,
} from "@expo-google-fonts/merriweather";
import { StripeProviderShim } from "../components/StripeProviderShim";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NominationProvider } from "../lib/nomination";
import { SessionProvider } from "../lib/session";
import { DemoWalletProvider } from "../lib/demoWallet";
import { ShareProvider } from "../lib/share";
import { ToneProvider } from "../lib/tone";

SplashScreen.preventAutoHideAsync().catch(() => {});

const STRIPE_PK =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder";

export default function RootLayout() {
  const [loaded] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
    Fraunces_400Regular,
    Fraunces_400Regular_Italic,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Merriweather_700Bold,
    Merriweather_900Black,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StripeProviderShim publishableKey={STRIPE_PK}>
          <SessionProvider>
            <DemoWalletProvider>
              <ToneProvider>
                <NominationProvider>
                  <ShareProvider>
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        animation: "slide_from_right",
                        contentStyle: { backgroundColor: "#F8F9F4" },
                      }}
                    />
                  </ShareProvider>
                </NominationProvider>
              </ToneProvider>
            </DemoWalletProvider>
          </SessionProvider>
        </StripeProviderShim>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
