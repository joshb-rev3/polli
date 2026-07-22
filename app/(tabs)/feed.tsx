import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BzzPath } from "../../components/Bzz";
import { FeedCard } from "../../components/FeedCard";
import { IconPlus } from "../../components/Icon";
import { NavBar } from "../../components/NavBar";
import { FEED, FeedItem, hasDonatedTo } from "../../lib/mockData";
import { useShare } from "../../lib/share";
import { useTone } from "../../lib/tone";
import { colors, fonts } from "../../theme";

export default function Feed() {
  const router = useRouter();
  const { copy } = useTone();
  const { openShare } = useShare();

  const onGive = (n: FeedItem) => router.push({ pathname: "/checkout", params: { id: n.id } });
  const onOpen = (n: FeedItem) => router.push({ pathname: "/nominee/[id]", params: { id: n.id } });
  const onShare = (n: FeedItem) => openShare({ name: n.name });

  return (
    <View style={{ flex: 1, backgroundColor: colors.green }}>
      <NavBar variant="green" />
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.intro}>
          <View style={styles.introText}>
            <Text style={styles.introTitle}>Your garden</Text>
            <Text style={styles.introSub}>
              Pollis you've started or supported — small gifts growing into something meaningful.
            </Text>
          </View>
          <Pressable
            style={styles.nominateBtn}
            onPress={() => router.push("/nominate/who")}
            accessibilityRole="button"
            accessibilityLabel="Nominate"
          >
            <IconPlus size={22} color={colors.green} />
            <Text style={styles.nominateBtnText}>Nominate</Text>
          </Pressable>
        </View>

        <BzzPath variant="feed" size={38} delay={4} />
        {FEED.map((n) => (
          <FeedCard
            key={n.id}
            n={n}
            viewerHasDonated={hasDonatedTo(n.id)}
            onGive={onGive}
            onOpen={onOpen}
            onShare={onShare}
          />
        ))}
        <Text style={styles.endCap}>— {copy.feed_empty} —</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 14,
    paddingBottom: 40,
    gap: 18,
    backgroundColor: colors.green,
    minHeight: "100%",
  },
  intro: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  introText: {
    flex: 1,
    minWidth: 0,
  },
  introTitle: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    color: colors.cream,
    lineHeight: 26,
  },
  introSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "rgba(243,233,220,0.78)",
    marginTop: 4,
    lineHeight: 18,
  },
  nominateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.marigold,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
  },
  nominateBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.green,
  },
  endCap: {
    textAlign: "center",
    color: "rgba(243,233,220,0.6)",
    fontSize: 12,
    paddingVertical: 12,
    fontFamily: fonts.serifItalic,
  },
});
