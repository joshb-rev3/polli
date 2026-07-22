import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { IconHeart, IconShare } from "../../components/Icon";
import { NavBar } from "../../components/NavBar";
import { FEED, hasDonatedTo, myNoteFor } from "../../lib/mockData";
import { useShare } from "../../lib/share";
import { colors, fonts } from "../../theme";

export default function Nominee() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { openShare } = useShare();
  const n = FEED.find((f) => f.id === id);

  if (!n) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <NavBar back title="Back" variant="paper" onBack={() => router.back()} />
        <View style={{ padding: 24 }}>
          <Text style={{ fontFamily: fonts.body, color: colors.ink2 }}>Nominee not found.</Text>
        </View>
      </View>
    );
  }

  const viewerHasDonated = hasDonatedTo(n.id);
  const myNote = myNoteFor(n.id);
  const first = n.name.split(" ")[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <NavBar
        back
        title="Back"
        variant="paper"
        onBack={() => router.back()}
        right={
          <Pressable
            onPress={() => openShare({ name: n.name })}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, padding: 8 }}
          >
            <IconShare size={16} color={colors.green} />
            <Text style={{ color: colors.green, fontFamily: fonts.bodySemi, fontSize: 14 }}>Share</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerCard}>
          <View style={styles.headerText}>
            <Text style={styles.headerName}>{n.name}</Text>
            <Text style={styles.headerType}>{n.cat.title}</Text>
            {viewerHasDonated ? (
              <Text style={styles.headerSub}>
                Thank you — you're part of {first}'s Polli with {n.backers} others.
              </Text>
            ) : (
              <Text style={styles.headerSub}>
                A little from you goes a long way for {first}.
              </Text>
            )}
          </View>
          <View style={styles.typeEmoji}>
            <Text style={styles.typeEmojiText}>{n.cat.emoji}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.liveDot} />
          <Text style={styles.metaText}>
            {viewerHasDonated
              ? `Live · ${n.daysLeft}d left · ${n.backers} chipping in`
              : `Live · ${n.daysLeft}d left`}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.eyebrow}>WHY CHIP IN</Text>
          <View style={styles.nominator}>
            <View style={styles.nomAv}>
              <Text style={styles.nomAvText}>{n.nominatorAv}</Text>
            </View>
            <Text style={styles.nomText}>
              <Text style={{ fontFamily: fonts.bodyBold }}>{n.nominator}</Text> shared this overview:
            </Text>
          </View>
          <Text style={styles.story}>"{n.story}"</Text>
          <Text style={styles.publicHint}>Public · anyone with the link can read this</Text>
        </View>

        {myNote ? (
          <View style={styles.section}>
            <Text style={styles.eyebrow}>YOUR NOTE FOR {first.toUpperCase()}</Text>
            <Text style={styles.myNote}>"{myNote}"</Text>
            <Text style={styles.publicHint}>Only {first} will see this</Text>
          </View>
        ) : null}

        {viewerHasDonated ? (
          <View style={styles.section}>
            <Text style={styles.eyebrow}>RECENT GIVERS</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
              {["M", "R", "J", "K", "L", "A", "P", "S"]
                .slice(0, Math.min(8, n.backers))
                .map((c, i) => (
                  <View
                    key={i}
                    style={[
                      styles.giverAv,
                      {
                        backgroundColor: `hsl(${(i * 47) % 360}, 55%, 55%)`,
                        marginLeft: i === 0 ? 0 : -8,
                      },
                    ]}
                  >
                    <Text style={styles.giverAvText}>{c}</Text>
                  </View>
                ))}
              {n.backers > 8 && (
                <View style={[styles.giverAv, { backgroundColor: colors.green, marginLeft: -8 }]}>
                  <Text style={[styles.giverAvText, { fontSize: 11 }]}>+{n.backers - 8}</Text>
                </View>
              )}
            </View>
          </View>
        ) : null}

        <View style={styles.sageBox}>
          <Text style={styles.sageText}>
            💚 <Text style={{ fontFamily: fonts.bodyBold }}>Every $1 goes to {first}.</Text>
          </Text>
          <Text style={styles.sageSub}>Paid out via Stripe within 5 business days of close.</Text>
        </View>
        <Text style={styles.eligibleLine}>
          Give once and you'll be eligible to be nominated for 12 months.
        </Text>
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.sticky, viewerHasDonated && styles.stickyThanks]}>
        {viewerHasDonated ? (
          <View style={styles.thanksBox}>
            <IconHeart size={18} color={colors.green} />
            <View style={{ flex: 1 }}>
              <Text style={styles.thanksTitle}>Thank you for showing up for {first}</Text>
              <Text style={styles.thanksSub}>
                Your $1 is already part of their Polli. Pass the link along if you want.
              </Text>
            </View>
          </View>
        ) : (
          <Button
            full
            label={`Send $1 to ${first}`}
            icon={<IconHeart size={16} color={colors.green} />}
            onPress={() => router.push({ pathname: "/checkout", params: { id: n.id } })}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  headerCard: {
    marginTop: 4,
    padding: 18,
    backgroundColor: colors.cream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line2,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    fontFamily: fonts.serifHeavy,
    fontSize: 26,
    lineHeight: 30,
    color: colors.ink,
  },
  headerType: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.green,
    marginTop: 4,
  },
  headerSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
    marginTop: 8,
    lineHeight: 19,
  },
  typeEmoji: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.line2,
    alignItems: "center",
    justifyContent: "center",
  },
  typeEmojiText: {
    fontSize: 28,
  },
  metaRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.sage,
  },
  metaText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
  },
  section: {
    marginTop: 22,
  },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.ink2,
    letterSpacing: 0.88,
    marginBottom: 8,
  },
  nominator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  nomAv: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.marigold,
    alignItems: "center",
    justifyContent: "center",
  },
  nomAvText: {
    color: "#fff",
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  nomText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  story: {
    marginTop: 12,
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 26,
    color: colors.ink,
  },
  publicHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink2,
    marginTop: 10,
  },
  myNote: {
    marginTop: 4,
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 26,
    color: colors.ink,
    padding: 16,
    backgroundColor: colors.blossomSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(244,164,184,0.45)",
  },
  giverAv: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.paper,
  },
  giverAvText: {
    color: "#fff",
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  sageBox: {
    marginTop: 20,
    padding: 14,
    backgroundColor: colors.sageSoft,
    borderWidth: 1,
    borderColor: "rgba(83,162,104,0.4)",
    borderRadius: 12,
  },
  sageText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink,
    lineHeight: 20,
  },
  sageSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink2,
    lineHeight: 18,
    marginTop: 6,
  },
  eligibleLine: {
    marginTop: 10,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink2,
    textAlign: "center",
    lineHeight: 18,
  },
  sticky: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  stickyThanks: {
    backgroundColor: "#E8F0EA",
    borderTopColor: "rgba(83,162,104,0.25)",
  },
  thanksBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  thanksTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.green,
    lineHeight: 20,
  },
  thanksSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
    marginTop: 4,
    lineHeight: 18,
  },
});
