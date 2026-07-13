import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "../components/Button";
import { IconCheck } from "../components/Icon";
import { NavBar } from "../components/NavBar";
import { success } from "../lib/haptics";
import { FEED, QUICK_NOTES } from "../lib/mockData";
import { payWithStripe } from "../lib/paymentSheet";
import { supabaseConfigured } from "../lib/supabase";
import { colors, fonts, shadows } from "../theme";

export default function Checkout() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const n = FEED.find((f) => f.id === id);

  const [method, setMethod] = useState<"apple" | "card" | "paypal">("apple");
  const [coverFees, setCoverFees] = useState(true);
  const [note, setNote] = useState("");
  const [anon, setAnon] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const total = coverFees ? 1.43 : 1.0;
  const toNominee = coverFees ? 1.0 : 0.57;
  const MAX = 140;
  const firstName = n?.name?.split(" ")[0] || "them";

  const finish = () => {
    success();
    router.replace({
      pathname: "/pay-complete",
      params: {
        id: n?.id || "",
        note: note.trim(),
        anon: anon ? "1" : "0",
      },
    });
  };

  const pay = async () => {
    setLoading(true);
    try {
      // Dev/simulator mode: no Supabase → simulated checkout so the flow still exits correctly.
      if (!supabaseConfigured) {
        setTimeout(() => {
          setLoading(false);
          finish();
        }, 1200);
        return;
      }

      const result = await payWithStripe({
        nominationId: n!.id,
        coverFees,
        note: note.trim() || undefined,
        anonymous: anon,
      });
      setLoading(false);
      if (result === "succeeded") finish();
    } catch (e: any) {
      setLoading(false);
      Alert.alert("Payment failed", e?.message ?? "Please try again.");
    }
  };

  if (!n) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <NavBar back title="Back" variant="paper" onBack={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <NavBar back title="Cancel" variant="paper" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.eyebrow}>YOU'RE GIVING TO</Text>
          <Text style={styles.name}>{n.name}</Text>

          <View style={styles.amountCard}>
            <Text style={styles.eyebrow}>YOUR GIFT</Text>
            <Text style={styles.amount}>$1</Text>
            <Text style={styles.amountSub}>One dollar. That's the whole thing.</Text>
            <Text style={styles.amountNote}>polli is always $1 — no more, no less.</Text>
          </View>

          <View style={styles.noteCard}>
            <View style={styles.noteHeadRow}>
              <View style={styles.noteEmoCircle}>
                <Text style={{ fontSize: 18 }}>💌</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.noteCardTitle}>Add a note for {firstName}</Text>
                <Text style={styles.noteCardSub}>
                  the more the merrier — {note.length ? `${note.length}/${MAX}` : "optional"}
                </Text>
              </View>
            </View>
            <TextInput
              value={note}
              onChangeText={(t) => setNote(t.slice(0, MAX))}
              onFocus={() => setNoteOpen(true)}
              placeholder={`Say something nice to ${firstName}…`}
              placeholderTextColor={colors.ink2}
              multiline
              style={[
                styles.textarea,
                { minHeight: noteOpen || note ? 72 : 44 },
              ]}
            />
            {(noteOpen || note) && (
              <>
                <View style={styles.chipRow}>
                  {QUICK_NOTES.map((q, i) => (
                    <Pressable key={i} onPress={() => setNote(q.slice(0, MAX))} style={styles.chip}>
                      <Text style={styles.chipText}>{q}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable style={styles.anonRow} onPress={() => setAnon(!anon)}>
                  <View style={[styles.checkbox, anon && { backgroundColor: colors.green, borderColor: colors.green }]}>
                    {anon && <IconCheck size={11} color="#fff" />}
                  </View>
                  <Text style={styles.anonText}>
                    Sign as <Text style={{ fontFamily: fonts.bodyBold }}>anonymous bee</Text> 🐝
                  </Text>
                </Pressable>
              </>
            )}
          </View>

          <Pressable style={[styles.feeCard, coverFees && styles.feeCardActive]} onPress={() => setCoverFees(!coverFees)}>
            <View style={[styles.checkbox, coverFees && { backgroundColor: colors.green, borderColor: colors.green }]}>
              {coverFees && <IconCheck size={13} color="#fff" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.feeTitle}>Cover the $0.43 in fees</Text>
              <Text style={styles.feeDesc}>
                {coverFees
                  ? `${firstName} gets the full $1.00. You pay $1.43.`
                  : `Without this, ${firstName} receives $0.57 after processing. You pay $1.00.`}
              </Text>
            </View>
          </Pressable>

          <Text style={[styles.eyebrow, { marginTop: 22, marginBottom: 10 }]}>PAYMENT METHOD</Text>
          {[
            { id: "apple", l: "Apple Pay", s: "•••• 4242", color: "#000", mark: "" },
            { id: "card", l: "Card", s: "Visa •••• 8109", color: "#1A1F71", mark: "VISA" },
            { id: "paypal", l: "PayPal", s: "you@email.com", color: "#003087", mark: "PP" },
          ].map((o) => {
            const active = method === o.id;
            return (
              <Pressable
                key={o.id}
                onPress={() => setMethod(o.id as any)}
                style={[styles.payRow, active && styles.payRowActive]}
              >
                <View style={[styles.payMark, { backgroundColor: o.color }]}>
                  <Text style={styles.payMarkText}>{o.mark}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payTitle}>{o.l}</Text>
                  <Text style={styles.paySub}>{o.s}</Text>
                </View>
                <View style={[styles.radio, active && { backgroundColor: colors.green, borderColor: colors.green }]}>
                  {active && <IconCheck size={12} color="#fff" />}
                </View>
              </Pressable>
            );
          })}

          <View style={styles.summary}>
            <Row label="Your $1 gift" value="$1.00" />
            {coverFees && <Row label="Processing & platform" value="$0.43" />}
            <View style={styles.summaryDivider} />
            <Row label="Total charged to you" value={`$${total.toFixed(2)}`} bold />
            <Row label={`${firstName} receives`} value={`$${toNominee.toFixed(2)}`} green />
          </View>

          <Text style={styles.fine}>
            Payments securely processed by <Text style={{ fontFamily: fonts.bodyBold }}>Stripe</Text>.
          </Text>
        </View>
      </ScrollView>
      <View style={styles.sticky}>
        <Button
          full
          label={loading ? "Processing…" : `Pay $${total.toFixed(2)}`}
          variant={method === "apple" ? "dark" : "dark"}
          disabled={loading}
          onPress={pay}
          style={method === "apple" ? { backgroundColor: "#000" } : { backgroundColor: colors.green }}
        />
      </View>
    </View>
  );
}

function Row({ label, value, bold, green }: { label: string; value: string; bold?: boolean; green?: boolean }) {
  return (
    <View style={rowStyles.row}>
      <Text style={[rowStyles.label, bold && { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 15 }, green && { color: colors.green2, fontFamily: fonts.bodySemi }]}>
        {label}
      </Text>
      <Text style={[rowStyles.value, bold && { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 15 }, green && { color: colors.green2 }]}>
        {value}
      </Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
  },
  value: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
  },
});

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 32,
    borderTopLeftRadius: 8,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.line2,
    ...shadows.card,
  },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.96,
    color: colors.ink2,
  },
  name: {
    fontFamily: fonts.serifBold,
    fontSize: 24,
    color: colors.ink,
    marginTop: 4,
  },
  amountCard: {
    marginTop: 24,
    padding: 22,
    backgroundColor: colors.cream,
    borderRadius: 16,
    alignItems: "center",
  },
  amount: {
    fontFamily: fonts.serifHeavy,
    fontSize: 88,
    lineHeight: 88,
    color: colors.green,
    marginTop: 10,
    letterSpacing: -2.64,
  },
  amountSub: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.ink2,
    marginTop: 6,
  },
  amountNote: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.ink2,
    marginTop: 2,
  },
  noteCard: {
    marginTop: 18,
    padding: 18,
    backgroundColor: "rgba(255,185,0,0.18)",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.marigold2,
  },
  noteHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  noteEmoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.marigold,
    alignItems: "center",
    justifyContent: "center",
  },
  noteCardTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.ink,
  },
  noteCardSub: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    color: colors.ink2,
    marginTop: 1,
  },
  textarea: {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line2,
    backgroundColor: "#fff",
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
    textAlignVertical: "top",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line2,
    backgroundColor: "#fff",
  },
  chipText: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    color: colors.ink2,
  },
  anonRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.line2,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  anonText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
  },
  feeCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line2,
    backgroundColor: "#fff",
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  feeCardActive: {
    backgroundColor: "rgba(255,185,0,0.14)",
    borderColor: colors.marigold2,
    borderWidth: 1.5,
  },
  feeTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
  },
  feeDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink2,
    marginTop: 4,
    lineHeight: 17,
  },
  payRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line2,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  payRowActive: {
    borderColor: colors.green,
    borderWidth: 1.5,
    backgroundColor: "rgba(83,162,104,0.08)",
  },
  payMark: {
    width: 36,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  payMarkText: {
    color: "#fff",
    fontFamily: fonts.bodyExtra,
    fontSize: 10,
  },
  payTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
  },
  paySub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink2,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.line2,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  summary: {
    marginTop: 18,
    padding: 14,
    backgroundColor: colors.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line2,
  },
  summaryDivider: {
    marginTop: 4,
    marginBottom: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line2,
  },
  fine: {
    marginTop: 12,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.ink2,
    textAlign: "center",
    lineHeight: 17,
  },
  sticky: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.line2,
  },
});
