import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Bzz, BzzPath } from "../components/Bzz";
import { Button } from "../components/Button";
import { Confetti } from "../components/Confetti";
import { Content } from "../components/Content";
import { IconClose, IconHeart, IconLink, IconMail, IconMsg, IconShare } from "../components/Icon";
import { NavBar } from "../components/NavBar";
import {
  clearLaunchComplete,
  nomineeTipMessage,
  nomineeTipSubject,
  readLaunchComplete,
  type LaunchCompletePayload,
} from "../lib/launchComplete";
import { tap } from "../lib/haptics";
import { hasVoiceKeepsake, useNomination } from "../lib/nomination";
import { SITE_HOST } from "../lib/seo";
import { useShare } from "../lib/share";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { useTone } from "../lib/tone";
import { colors, fonts } from "../theme";

function paramOne(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function slugifyName(first: string, last: string) {
  const base = `${first || "me"}-${last || "x"}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  return base.replace(/(^-|-$)/g, "") || "friend";
}

function smsUrl(phone: string | undefined, body: string) {
  const digits = (phone || "").replace(/[^\d+]/g, "");
  const encoded = encodeURIComponent(body);
  if (Platform.OS === "ios") {
    return digits ? `sms:${digits}&body=${encoded}` : `sms:&body=${encoded}`;
  }
  return digits ? `sms:${digits}?body=${encoded}` : `sms:?body=${encoded}`;
}

function mailUrl(email: string | undefined, subject: string, body: string) {
  const to = (email || "").trim();
  const qs = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return to ? `mailto:${to}?${qs}` : `mailto:?${qs}`;
}

export default function LaunchComplete() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    first?: string;
    last?: string;
    slug?: string;
    nominationId?: string;
    keepsake?: string;
  }>();
  const { draft, reset } = useNomination();
  const { copy } = useTone();
  const { openShare } = useShare();
  const [copied, setCopied] = useState(false);
  const [sharedOnce, setSharedOnce] = useState(false);
  const [tipped, setTipped] = useState<"text" | "email" | null>(null);
  const [stored, setStored] = useState<LaunchCompletePayload | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const fromStore = await readLaunchComplete();
      if (!alive) return;

      let resolved = fromStore;

      const paramFirst = paramOne(params.first).trim();
      const paramLast = paramOne(params.last).trim();
      const paramSlug = paramOne(params.slug).trim();
      const paramNomId = paramOne(params.nominationId).trim();

      if (paramFirst || paramSlug || paramNomId) {
        resolved = {
          first: paramFirst || fromStore?.first || "",
          last: paramLast || fromStore?.last || "",
          slug: paramSlug || fromStore?.slug,
          nominationId: paramNomId || fromStore?.nominationId,
          keepsake: paramOne(params.keepsake) === "1" || Boolean(fromStore?.keepsake),
          email: fromStore?.email,
          phone: fromStore?.phone,
          notify: fromStore?.notify,
        };
      }

      if (resolved && !resolved.first && resolved.nominationId && supabaseConfigured) {
        const { data } = await supabase
          .from("nominations")
          .select("nominee_first, nominee_last, slug, nominee_email, nominee_phone")
          .eq("id", resolved.nominationId)
          .maybeSingle();
        if (data && alive) {
          resolved = {
            ...resolved,
            first: String(data.nominee_first ?? "").trim(),
            last: String(data.nominee_last ?? "").trim(),
            slug: resolved.slug || String(data.slug ?? ""),
            email: resolved.email || String(data.nominee_email ?? "").trim() || undefined,
            phone: resolved.phone || String(data.nominee_phone ?? "").trim() || undefined,
          };
        }
      }

      if (alive) setStored(resolved);
    })();
    return () => {
      alive = false;
    };
  }, [params.first, params.last, params.slug, params.nominationId, params.keepsake]);

  const firstName =
    paramOne(params.first).trim() || stored?.first || draft.first.trim();
  const lastName =
    paramOne(params.last).trim() || stored?.last || draft.last.trim();
  const slug =
    paramOne(params.slug).trim() || stored?.slug || slugifyName(firstName, lastName);
  const keepsake =
    paramOne(params.keepsake) === "1" ||
    Boolean(stored?.keepsake) ||
    hasVoiceKeepsake(draft);
  const email = stored?.email || draft.email.trim() || "";
  const phone = stored?.phone || draft.phone.trim() || "";
  const displayName = firstName || "Your friend";
  const fullName = `${firstName} ${lastName}`.trim() || displayName;
  const shareUrl = `https://${SITE_HOST}/${slug}`;
  const total = keepsake ? 2 : 1;

  const tipBody = useMemo(() => nomineeTipMessage(firstName), [firstName]);
  const tipSubject = useMemo(() => nomineeTipSubject(firstName), [firstName]);

  const home = async () => {
    await clearLaunchComplete();
    reset();
    router.replace("/(tabs)/feed");
  };

  const copyLink = async () => {
    tap();
    await Clipboard.setStringAsync(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sharePolli = () => {
    tap();
    setSharedOnce(true);
    openShare({ name: fullName, slug });
  };

  const openTip = async (channel: "text" | "email") => {
    tap();
    const url =
      channel === "text"
        ? smsUrl(phone, tipBody)
        : mailUrl(email, tipSubject, tipBody);
    try {
      const can = await Linking.canOpenURL(url);
      if (!can && Platform.OS !== "web") {
        Alert.alert(
          channel === "text" ? "Messages unavailable" : "Mail unavailable",
          "Copy the message and send it another way.",
        );
        await Clipboard.setStringAsync(tipBody);
        return;
      }
      await Linking.openURL(url);
      setTipped(channel);
    } catch {
      await Clipboard.setStringAsync(tipBody);
      Alert.alert("Message copied", "Paste it into a text or email to send.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.green }}>
      <NavBar
        variant="green"
        right={
          <Pressable onPress={home} style={{ padding: 8, opacity: 0.7 }}>
            <IconClose size={22} color={colors.green} />
          </Pressable>
        }
      />
      <Confetti count={16} />
      <BzzPath variant="launch" size={40} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <Content pad={0} padBottom={36} style={styles.contentShell}>
        <View style={styles.hero}>
          <View style={styles.checkCircle}>
            <IconHeart size={36} color="#fff" />
            <View style={styles.waveBee}>
              <Bzz pose="wave" size={44} />
            </View>
          </View>
          <Text style={styles.title}>
            <Text style={styles.titleAccent}>{displayName}'s Polli</Text>
            {"\n"}
            {copy.launch_title}
          </Text>
          <Text style={styles.sub}>
            {total > 1
              ? `You kicked it off with $${total} (including your voice keepsake).`
              : "You gave the first dollar."}{" "}
            Now share it — every share helps friends pile on.
          </Text>
        </View>

        <View style={styles.panel}>
          <View style={styles.primaryCard}>
            <Text style={styles.stepEyebrow}>STEP 1 · MOST IMPORTANT</Text>
            <Text style={styles.cardTitle}>Share so people pile on</Text>
            <Text style={styles.cardBody}>
              Post the link to your stories, group chats, and feeds. The more people who see it,
              the more dollars {displayName} gets.
            </Text>

            <Pressable style={styles.linkChip} onPress={copyLink} accessibilityRole="button">
              <IconLink size={14} color={colors.green} />
              <Text style={styles.linkText} numberOfLines={1}>
                {SITE_HOST}/{slug}
              </Text>
              <Text style={styles.copyHint}>{copied ? "Copied!" : "Copy"}</Text>
            </Pressable>

            <Button
              full
              label={sharedOnce ? "Share again" : "Share on social"}
              variant="marigold"
              icon={<IconShare size={16} color={colors.ink} />}
              onPress={sharePolli}
            />
            {!sharedOnce ? (
              <Text style={styles.nudge}>Don't skip this — sharing is how a Polli grows.</Text>
            ) : (
              <Text style={styles.nudgeDone}>Nice — share it in a couple more places if you can.</Text>
            )}
          </View>

          <View style={styles.secondaryCard}>
            <Text style={styles.stepEyebrowSecondary}>STEP 2 · GIVE THEM A HEADS-UP</Text>
            <Text style={styles.cardTitleDark}>Let {displayName} know something's coming</Text>
            <Text style={styles.cardBodyDark}>
              Send a quick text or email so they know to watch for a message from Polli — that's
              how they'll claim their funds.
            </Text>

            <View style={styles.tipActions}>
              <Pressable
                style={[styles.tipBtn, tipped === "text" && styles.tipBtnDone]}
                onPress={() => openTip("text")}
                accessibilityRole="button"
                accessibilityLabel={`Text ${displayName}`}
              >
                <View style={[styles.tipIcon, { backgroundColor: "#25D366" }]}>
                  <IconMsg size={18} color="#fff" />
                </View>
                <Text style={styles.tipBtnText}>
                  {tipped === "text" ? "Text opened" : "Send a text"}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tipBtn, tipped === "email" && styles.tipBtnDone]}
                onPress={() => openTip("email")}
                accessibilityRole="button"
                accessibilityLabel={`Email ${displayName}`}
              >
                <View style={[styles.tipIcon, { backgroundColor: "#EA4335" }]}>
                  <IconMail size={18} color="#fff" />
                </View>
                <Text style={styles.tipBtnText}>
                  {tipped === "email" ? "Email opened" : "Send an email"}
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.later} onPress={home}>
            <Text style={styles.laterText}>I'll finish this later</Text>
          </Pressable>
        </View>
        </Content>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
  },
  contentShell: {
    flexGrow: 1,
  },
  hero: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 20,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.coral,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: colors.coral,
    shadowOpacity: 0.45,
    shadowRadius: 18,
  },
  waveBee: {
    position: "absolute",
    top: -18,
    right: -14,
  },
  title: {
    fontFamily: fonts.serifHeavy,
    fontSize: 34,
    lineHeight: 36,
    color: colors.cream,
    textAlign: "center",
    marginTop: 20,
  },
  titleAccent: {
    fontFamily: fonts.serifItalic,
    color: colors.marigold,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.cream,
    opacity: 0.9,
    marginTop: 12,
    textAlign: "center",
    maxWidth: 340,
    lineHeight: 22,
  },
  panel: {
    paddingHorizontal: 20,
    gap: 14,
  },
  primaryCard: {
    backgroundColor: colors.cream,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,251,245,0.35)",
    gap: 10,
  },
  secondaryCard: {
    backgroundColor: "rgba(255,251,245,0.1)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,251,245,0.28)",
    gap: 10,
  },
  stepEyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.coral,
  },
  stepEyebrowSecondary: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.marigold,
  },
  cardTitle: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    color: colors.ink,
    lineHeight: 26,
  },
  cardTitleDark: {
    fontFamily: fonts.serifBold,
    fontSize: 20,
    color: colors.cream,
    lineHeight: 24,
  },
  cardBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink2,
    lineHeight: 21,
  },
  cardBodyDark: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.cream,
    opacity: 0.88,
    lineHeight: 21,
  },
  linkChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 2,
  },
  linkText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
  },
  copyHint: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.green,
  },
  nudge: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.coral,
    textAlign: "center",
    marginTop: 2,
  },
  nudgeDone: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.green,
    textAlign: "center",
    marginTop: 2,
  },
  tipActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  tipBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.cream,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  tipBtnDone: {
    opacity: 0.85,
  },
  tipIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tipBtnText: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.ink,
  },
  later: {
    alignItems: "center",
    paddingVertical: 14,
  },
  laterText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.cream,
    opacity: 0.65,
    textDecorationLine: "underline",
  },
});
