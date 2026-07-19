import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { NavBar } from "../components/NavBar";
import { useDemoWallet } from "../lib/demoWallet";
import { useSession } from "../lib/session";
import { colors, fonts, shadows } from "../theme";

export default function Auth() {
  const router = useRouter();
  const { signInDemo } = useSession();
  const demoWallet = useDemoWallet();
  const [busy, setBusy] = useState<string | null>(null);

  // Simulated social login — Apple unlocks the payout simulation; Google stays on the normal path.
  const continueAs = (provider: "apple" | "google" | "facebook", name: string) => async () => {
    setBusy(provider);
    await new Promise((r) => setTimeout(r, 400));
    signInDemo(name, provider);
    setBusy(null);

    if (provider === "apple") {
      demoWallet.seedForAppleDemo();
      router.replace("/payout");
      return;
    }

    demoWallet.reset();
    router.replace("/(tabs)/feed");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <NavBar back title="Back" variant="paper" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>Give kindness today.</Text>
          <Text style={styles.sub}>Create your polli account</Text>
          <View style={styles.authBtns}>
            <Pressable
              style={[styles.authBtn, styles.authBtnDark]}
              onPress={continueAs("apple", "Apple User")}
              disabled={busy !== null}
            >
              <AppleIcon />
              <Text style={[styles.authBtnText, { color: "#fff" }]}>
                {busy === "apple" ? "Signing in…" : "Continue with Apple"}
              </Text>
            </Pressable>
            <Pressable
              style={styles.authBtn}
              onPress={continueAs("google", "Google User")}
              disabled={busy !== null}
            >
              <GoogleIcon />
              <Text style={styles.authBtnText}>
                {busy === "google" ? "Signing in…" : "Continue with Google"}
              </Text>
            </Pressable>
            <Pressable
              style={styles.authBtn}
              onPress={continueAs("facebook", "FB User")}
              disabled={busy !== null}
            >
              <FacebookIcon />
              <Text style={styles.authBtnText}>
                {busy === "facebook" ? "Signing in…" : "Continue with Facebook"}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.fine}>
            By continuing, you agree to our Terms and acknowledge our Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-2 3.3-4.8 3.3-8.1z" />
      <Path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.6l-3.6-2.7a6.8 6.8 0 0 1-10.1-3.5H1.9v2.8A11 11 0 0 0 12 23z" />
      <Path fill="#FBBC04" d="M5.6 14.2a6.6 6.6 0 0 1 0-4.2V7.2H1.9a11 11 0 0 0 0 9.6l3.7-2.6z" />
      <Path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 1.9 7.2l3.7 2.8A6.6 6.6 0 0 1 12 5.4z" />
    </Svg>
  );
}
function AppleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        fill="#fff"
        d="M17.6 12.7c0-2.9 2.3-4.2 2.4-4.3-1.3-1.9-3.4-2.2-4.1-2.2-1.7-.2-3.4 1-4.3 1-.9 0-2.3-1-3.8-.9-1.9 0-3.7 1.1-4.7 2.9-2 3.5-.5 8.7 1.4 11.5.9 1.4 2.1 3 3.6 2.9 1.4-.1 2-.9 3.7-.9s2.2.9 3.8.9c1.6 0 2.6-1.4 3.5-2.8 1.1-1.6 1.5-3.2 1.6-3.3-.1-.1-3.1-1.2-3.1-4.8zM15 4.2a5 5 0 0 0 1.1-3.6c-1.1.1-2.4.8-3.2 1.7a4.7 4.7 0 0 0-1.1 3.5c1.2.1 2.5-.6 3.2-1.6z"
      />
    </Svg>
  );
}
function FacebookIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        fill="#1877F2"
        d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7v-3.5h3.1V9.4c0-3 1.8-4.7 4.6-4.7 1.3 0 2.7.2 2.7.2v3H15.9c-1.5 0-2 .9-2 1.9v2.2h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 32,
    borderTopLeftRadius: 8,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.line2,
    gap: 24,
    alignItems: "center",
    ...shadows.card,
  },
  title: {
    fontFamily: fonts.serifSemi,
    fontSize: 34,
    lineHeight: 36,
    color: colors.ink,
    textAlign: "center",
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink2,
    textAlign: "center",
  },
  authBtns: {
    width: "100%",
    gap: 10,
  },
  authBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  authBtnDark: {
    backgroundColor: colors.ink,
  },
  authBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink,
  },
  fine: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.ink2,
    textAlign: "center",
    lineHeight: 16,
  },
});
