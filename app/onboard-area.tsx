import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NavBar } from "../components/NavBar";
import { Content } from "../components/Content";
import { saveHomeArea, skipHomeArea } from "../lib/homeArea";
import { useSession } from "../lib/session";
import { colors, fonts, shadows } from "../theme";

function paramOne(v: string | string[] | undefined) {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export default function OnboardArea() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string; id?: string }>();
  const { userId } = useSession();
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = paramOne(params.next);
  const feedId = paramOne(params.id);
  const forFeed = !next || next === "feed";

  const goNext = () => {
    if (next === "start") {
      router.replace("/start/who");
    } else if (next === "checkout") {
      router.replace({
        pathname: "/checkout",
        params: feedId ? { id: feedId } : undefined,
      });
    } else if (next === "payout") {
      router.replace("/payout");
    } else if (next === "profile") {
      router.replace("/(tabs)/profile");
    } else {
      router.replace("/(tabs)/feed");
    }
  };

  const onContinue = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveHomeArea(userId, { zip, city, region });
      goNext();
    } catch (e: any) {
      setError(e?.message ?? "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const onSkip = async () => {
    setBusy(true);
    setError(null);
    try {
      await skipHomeArea(userId);
      goNext();
    } catch (e: any) {
      setError(e?.message ?? "Could not skip");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <NavBar title="Almost there" variant="paper" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Content pad={24}>
          <View style={styles.card}>
            <Text style={styles.title}>
              {forFeed ? "Find Pollis near you" : "Where should we look first?"}
            </Text>
            <Text style={styles.sub}>
              {forFeed
                ? "Your ZIP helps us show people and Pollis in your area before you give or start one."
                : "A ZIP (or city and state) helps us surface Pollis from people near you. You can change this anytime."}
            </Text>

            <View>
              <Text style={styles.label}>ZIP code</Text>
              <TextInput
                value={zip}
                onChangeText={(t) => setZip(t.replace(/[^\d-]/g, "").slice(0, 10))}
                placeholder="11201"
                placeholderTextColor={colors.inkMuted}
                keyboardType="number-pad"
                autoComplete="postal-code"
                textContentType="postalCode"
                style={styles.input}
                editable={!busy}
              />
            </View>

            <Text style={styles.or}>Optional — city & state</Text>

            <View style={styles.fields}>
              <View style={{ flex: 1.4 }}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="Brooklyn"
                  placeholderTextColor={colors.inkMuted}
                  autoComplete="postal-address"
                  textContentType="addressCity"
                  style={styles.input}
                  editable={!busy}
                />
              </View>
              <View style={{ flex: 0.7 }}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  value={region}
                  onChangeText={(t) => setRegion(t.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2))}
                  placeholder="NY"
                  placeholderTextColor={colors.inkMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={2}
                  autoComplete="postal-address-region"
                  textContentType="addressState"
                  style={styles.input}
                  editable={!busy}
                />
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.primary, busy && styles.disabled]}
              onPress={onContinue}
              disabled={busy}
            >
              <Text style={styles.primaryText}>
                {busy ? "Saving…" : forFeed ? "Show my garden" : "Continue"}
              </Text>
            </Pressable>
            <Pressable onPress={onSkip} disabled={busy} hitSlop={8}>
              <Text style={styles.skip}>{busy ? "…" : "Skip for now"}</Text>
            </Pressable>
          </View>
        </Content>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 24,
  },
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
    fontFamily: fonts.serifSemi,
    fontSize: 30,
    lineHeight: 34,
    color: colors.ink,
    textAlign: "center",
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink2,
    textAlign: "center",
  },
  or: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: 4,
  },
  fields: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.ink2,
    marginBottom: 6,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    borderWidth: 1.5,
    borderColor: colors.line2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.paper,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "#B42318",
    textAlign: "center",
  },
  primary: {
    marginTop: 4,
    backgroundColor: colors.ink,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryText: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: "#fff",
  },
  disabled: {
    opacity: 0.6,
  },
  skip: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink2,
    textAlign: "center",
    paddingVertical: 4,
  },
});
