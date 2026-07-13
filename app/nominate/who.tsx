import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "../../components/Button";
import { IconArrow } from "../../components/Icon";
import { NavBar } from "../../components/NavBar";
import { Stepper } from "../../components/Stepper";
import { useNomination } from "../../lib/nomination";
import { colors, fonts, shadows } from "../../theme";

export default function Who() {
  const router = useRouter();
  const { draft, set } = useNomination();
  const ok = draft.first.trim() && draft.last.trim();

  const NOTIFY = [
    { id: "email", l: "Email" },
    { id: "phone", l: "Mobile number" },
    { id: "both", l: "Both" },
  ] as const;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <NavBar back title="Back" variant="paper" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <Stepper step={0} total={5} />
        <View style={styles.card}>
          <Text style={styles.title}>Who deserves a little kindness today?</Text>
          <Text style={styles.sub}>Let's set up their polli. Takes about 60 seconds.</Text>
          <View style={{ marginTop: 22, gap: 14 }}>
            <Field label="First name">
              <TextInput
                value={draft.first}
                onChangeText={(t) => set({ first: t })}
                placeholder="Josh"
                placeholderTextColor={colors.ink2}
                style={styles.input}
              />
            </Field>
            <Field label="Last name">
              <TextInput
                value={draft.last}
                onChangeText={(t) => set({ last: t })}
                placeholder="Bauer"
                placeholderTextColor={colors.ink2}
                style={styles.input}
              />
            </Field>
            <View>
              <Text style={styles.fieldLabel}>How can we notify them?</Text>
              {NOTIFY.map((o) => (
                <Pressable
                  key={o.id}
                  style={styles.radio}
                  onPress={() => set({ notify: o.id as any })}
                >
                  <View style={[styles.radioDot, draft.notify === o.id && styles.radioDotChecked]}>
                    {draft.notify === o.id && <View style={styles.radioDotInner} />}
                  </View>
                  <Text style={styles.radioLbl}>{o.l}</Text>
                </Pressable>
              ))}
              <View style={[styles.fieldBox, { marginTop: 6 }]}>
                <TextInput
                  value={draft.contact}
                  onChangeText={(t) => set({ contact: t })}
                  placeholder={draft.notify === "phone" ? "(555) 123-4567" : "them@example.com"}
                  placeholderTextColor={colors.ink2}
                  keyboardType={draft.notify === "phone" ? "phone-pad" : "email-address"}
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 18 }}>
          <Button
            label="Continue"
            iconRight={<IconArrow size={18} color={colors.green} />}
            disabled={!ok}
            onPress={() => router.push("/nominate/category")}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldBox}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 32,
    borderTopLeftRadius: 8,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.line2,
    marginTop: 14,
    ...shadows.card,
  },
  title: {
    fontFamily: fonts.serifHeavyBold,
    fontSize: 28,
    color: colors.ink,
    lineHeight: 32,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink2,
    marginTop: 8,
    lineHeight: 22,
  },
  fieldLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.ink2,
    letterSpacing: 0.72,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  fieldBox: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 54,
    justifyContent: "center",
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 0,
  },
  radio: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  radioDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDotChecked: {
    borderColor: colors.green,
  },
  radioDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.green,
  },
  radioLbl: {
    fontFamily: fonts.bodyMed,
    fontSize: 16,
    color: colors.ink,
  },
});
