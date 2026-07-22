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
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <NavBar
        variant="paper"
        right={
          <Pressable
            style={styles.nominateBtn}
            onPress={() => router.push("/nominate/who")}
            accessibilityRole="button"
            accessibilityLabel="Start a Polli"
          >
            <IconPlus size={16} color={colors.green} />
            <Text style={styles.nominateBtnText}>Start a Polli</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Your garden</Text>
          <Text style={styles.introSub}>
            Pollis you've started or supported — small gifts growing into something meaningful.
          </Text>
        </View>

        <View style={styles.beeLane} pointerEvents="none" collapsable={false}>
          <BzzPath variant="feed" size={36} delay={4} />
        </View>

        <View style={styles.feedStack}>
          {FEED.map((n, i) => (
            <View key={n.id}>
              {i > 0 ? <View style={styles.separator} /> : null}
              <FeedCard
                n={n}
                viewerHasDonated={hasDonatedTo(n.id)}
                onGive={onGive}
                onOpen={onOpen}
                onShare={onShare}
              />
            </View>
          ))}
        </View>

        <Text style={styles.endCap}>— {copy.feed_empty} —</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  nominateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.marigold,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    zIndex: 1,
  },
  nominateBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.green,
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 40,
    backgroundColor: colors.paper,
    minHeight: "100%",
  },
  intro: {
    paddingHorizontal: 2,
    paddingTop: 16,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line2,
    zIndex: 1,
  },
  introTitle: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    color: colors.green,
    lineHeight: 26,
  },
  introSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
    marginTop: 6,
    lineHeight: 18,
  },
  beeLane: {
    height: 48,
    zIndex: 20,
    marginBottom: 4,
    overflow: "visible",
  },
  feedStack: {
    gap: 0,
    zIndex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line2,
    marginVertical: 18,
    marginHorizontal: 2,
  },
  endCap: {
    textAlign: "center",
    color: colors.inkMuted,
    fontSize: 12,
    paddingVertical: 8,
    marginTop: 8,
    fontFamily: fonts.serifItalic,
  },
});
