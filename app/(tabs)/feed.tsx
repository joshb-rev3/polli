import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { BzzPath } from "../../components/Bzz";
import { FeedCard } from "../../components/FeedCard";
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
  endCap: {
    textAlign: "center",
    color: "rgba(243,233,220,0.6)",
    fontSize: 12,
    paddingVertical: 12,
    fontFamily: fonts.serifItalic,
  },
});
