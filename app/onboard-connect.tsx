// Nominee-facing: opens Stripe Connect onboarding in a WebBrowser session.
// Linked from the email/SMS the nominee receives when someone nominates them.

import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { IconArrow } from "../components/Icon";
import { NavBar } from "../components/NavBar";
import { FakeStatusBar } from "../components/StatusBar";
import { getConnectOnboardingUrl } from "../lib/stripe";
import { supabaseConfigured } from "../lib/supabase";
import { colors, fonts, shadows } from "../theme";

export default function OnboardConnect() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const begin = async () => {
    if (!supabaseConfigured) {
      setErr("Supabase/Stripe not configured in this build.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const url = await getConnectOnboardingUrl();
      await WebBrowser.openAuthSessionAsync(url, "polli://connect-return");
      router.replace("/(tabs)/profile");
    } catch (e: any) {
      setErr(e?.message ?? "Could not start onboarding.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <FakeStatusBar />
      <NavBar back title="Back" variant="paper" onBack={() => router.back()} />
      <View style={{ padding: 20 }}>
        <View style={styles.card}>
          <Text style={styles.title}>Set up your payout</Text>
          <Text style={styles.sub}>
            You've been nominated! To receive your funds, link a debit card or bank account. We partner with
            Stripe so your details never touch our servers.
          </Text>
          <View style={styles.bullets}>
            <Text style={styles.bullet}>• Takes under 2 minutes</Text>
            <Text style={styles.bullet}>• Stripe handles ID + bank verification</Text>
            <Text style={styles.bullet}>• Funds arrive within 5 business days of close</Text>
          </View>
          {err && <Text style={styles.err}>{err}</Text>}
          <Button
            full
            label={busy ? "Opening Stripe…" : "Start onboarding"}
            onPress={begin}
            disabled={busy}
            iconRight={<IconArrow size={18} color={colors.green} />}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 32,
    borderTopLeftRadius: 8,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.line2,
    gap: 16,
    ...shadows.card,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 28,
    color: colors.ink,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink2,
    lineHeight: 22,
  },
  bullets: {
    gap: 6,
  },
  bullet: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  err: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.coral,
  },
});
