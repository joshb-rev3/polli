import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { IconHeart, IconShare } from "../../components/Icon";
import { NavBar } from "../../components/NavBar";
import { FEED, NOTES } from "../../lib/mockData";
import { ordinal } from "../../lib/ordinal";
import { useShare } from "../../lib/share";
import { colors, fonts } from "../../theme";
import { VoiceMessagePlayer } from "../../components/voice/VoiceMessageComposer";

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

  const notes = NOTES[n.id] || [];

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
        <LinearGradient colors={n.photo as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE · {n.daysLeft}D LEFT</Text>
          </View>
          <View style={styles.heroBottom}>
            <Text style={styles.heroCat}>
              {n.cat.emoji} {n.cat.title.toUpperCase()}
            </Text>
            <Text style={styles.heroName}>{n.name}</Text>
            <Text style={styles.heroRole}>{n.role}</Text>
          </View>
        </LinearGradient>

        <View style={styles.giverCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.giverBig}>{n.backers}</Text>
            <Text style={styles.giverSub}>
              friends have piled on.{"\n"}Be the {n.backers + 1}
              <Text style={{ fontSize: 11 }}>{ordinal(n.backers + 1)}</Text>.
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.daysBig}>
              {n.daysLeft}
              <Text style={styles.daysSm}>d</Text>
            </Text>
            <Text style={styles.daysLabel}>LEFT</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.eyebrow}>NOMINATED BY</Text>
          <View style={styles.nominator}>
            <View style={styles.nomAv}>
              <Text style={styles.nomAvText}>{n.nominatorAv}</Text>
            </View>
            <Text style={styles.nomText}>
              <Text style={{ fontFamily: fonts.bodyBold }}>{n.nominator}</Text> wrote:
            </Text>
          </View>
          <Text style={styles.story}>"{n.story}"</Text>
          {n.storyAudioUri && n.storyWords && n.storySignatures ? (
            <View style={{ marginTop: 12 }}>
              <VoiceMessagePlayer
                uri={n.storyAudioUri}
                words={n.storyWords}
                signatures={n.storySignatures}
                durationMs={n.storyAudioDurationMs ?? 0}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.eyebrow}>💌 NOTES FROM THE GARDEN</Text>
          {notes.length === 0 ? (
            <View style={styles.emptyNote}>
              <Text style={styles.emptyNoteText}>Be the first to leave a note.</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {notes.slice(0, 4).map((note, i) => (
                <View key={i} style={styles.noteCard}>
                  <View style={styles.noteHead}>
                    <View
                      style={[
                        styles.noteAv,
                        note.anon && { backgroundColor: colors.marigold },
                        !note.anon && { backgroundColor: `hsl(${(i * 73) % 360}, 55%, 55%)` },
                      ]}
                    >
                      <Text style={styles.noteAvText}>{note.av}</Text>
                    </View>
                    <Text style={styles.noteFrom}>{note.from}</Text>
                    <Text style={styles.noteWhen}>{note.when}</Text>
                  </View>
                  <Text style={styles.noteText}>"{note.text}"</Text>
                </View>
              ))}
              {notes.length > 4 && (
                <Pressable style={styles.seeAll}>
                  <Text style={styles.seeAllText}>See all {notes.length} notes</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

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

        <View style={styles.sageBox}>
          <Text style={styles.sageText}>
            💚 <Text style={{ fontFamily: fonts.bodyBold }}>Every $1 goes to {n.name.split(" ")[0]}.</Text> Paid out via Stripe within 5 business days of close.
          </Text>
        </View>
        <Text style={styles.eligibleLine}>Give once and you'll be eligible to be nominated for 12 months.</Text>
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.sticky}>
        <Button
          full
          label={`Give $1 to ${n.name.split(" ")[0]}`}
          variant="danger"
          icon={<IconHeart size={16} color="#fff" />}
          onPress={() => router.push({ pathname: "/checkout", params: { id: n.id } })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  hero: {
    height: 280,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    justifyContent: "flex-end",
    padding: 16,
    marginTop: 8,
  },
  livePill: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(27,77,62,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#7ED48A",
  },
  liveText: {
    color: "#fff",
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.66,
  },
  heroBottom: {},
  heroCat: {
    color: "#fff",
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.48,
    opacity: 0.85,
  },
  heroName: {
    color: "#fff",
    fontFamily: fonts.serifHeavy,
    fontSize: 30,
    lineHeight: 32,
    marginTop: 4,
  },
  heroRole: {
    color: "#fff",
    fontFamily: fonts.body,
    fontSize: 13,
    opacity: 0.85,
    marginTop: 2,
  },
  giverCard: {
    marginTop: 20,
    padding: 18,
    backgroundColor: colors.cream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line2,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  giverBig: {
    fontFamily: fonts.serifHeavy,
    fontSize: 42,
    color: colors.green,
    letterSpacing: -0.84,
    lineHeight: 42,
  },
  giverSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 44,
    backgroundColor: colors.line2,
  },
  daysBig: {
    fontFamily: fonts.serifBold,
    fontSize: 24,
    color: colors.ink,
  },
  daysSm: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
  },
  daysLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.ink2,
    letterSpacing: 0.66,
    marginTop: 2,
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
  emptyNote: {
    padding: 18,
    backgroundColor: colors.cream,
    borderRadius: 12,
    alignItems: "center",
  },
  emptyNoteText: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.ink2,
  },
  noteCard: {
    padding: 14,
    backgroundColor: colors.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line2,
  },
  noteHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  noteAv: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  noteAvText: {
    color: "#fff",
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  noteFrom: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.ink,
  },
  noteWhen: {
    marginLeft: "auto",
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.ink2,
  },
  noteText: {
    fontFamily: fonts.serifItalic,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },
  seeAll: {
    padding: 10,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 10,
    alignItems: "center",
  },
  seeAllText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.ink2,
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
});
