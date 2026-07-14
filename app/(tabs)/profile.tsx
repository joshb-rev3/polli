import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { NavBar } from "../../components/NavBar";
import { IconShare } from "../../components/Icon";
import { ME, MY_GIVES, MY_NOMINATIONS } from "../../lib/mockData";
import { useSession } from "../../lib/session";
import { useShare } from "../../lib/share";
import { supabaseConfigured } from "../../lib/supabase";
import { fetchWallet, requestCashout, type WalletSummary } from "../../lib/wallet";
import { colors, fonts } from "../../theme";

function formatDollars(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export default function Profile() {
  const router = useRouter();
  const { openShare } = useShare();
  const { userId, name } = useSession();
  const [tab, setTab] = useState<"noms" | "giving">("noms");
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [cashoutBusy, setCashoutBusy] = useState(false);
  const [cashoutMsg, setCashoutMsg] = useState<string | null>(null);

  const refreshWallet = useCallback(async () => {
    if (!userId || !supabaseConfigured) {
      setWallet(null);
      return;
    }
    const w = await fetchWallet(userId);
    setWallet(w);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      refreshWallet();
    }, [refreshWallet]),
  );

  const onCashout = async () => {
    if (!wallet || wallet.balanceCents < 100) return;
    setCashoutBusy(true);
    setCashoutMsg(null);
    try {
      if (!wallet.connectReady) {
        router.push("/onboard-connect");
        return;
      }
      const result = await requestCashout({ amountCents: wallet.balanceCents });
      setCashoutMsg(`Sent ${formatDollars(result.amountCents)} — on its way to your bank.`);
      await refreshWallet();
    } catch (e: any) {
      const msg = e?.message ?? "Cashout failed";
      if (msg.includes("connect_onboarding_required")) {
        router.push("/onboard-connect");
      } else {
        setCashoutMsg(msg);
      }
    } finally {
      setCashoutBusy(false);
    }
  };

  const displayName = name ?? ME.name;
  const receivedDisplay = wallet
    ? formatDollars(wallet.lifetimeReceivedCents)
    : `$${ME.received}`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.green }}>
      <NavBar
        variant="green"
        right={
          <Pressable onPress={() => openShare({ name: displayName })} style={{ padding: 8, opacity: 0.7 }}>
            <IconShare size={18} color={colors.green} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <LinearGradient colors={[colors.marigold, colors.green]} style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.memberSince}>member since today</Text>
            {ME.eligible && (
              <View style={styles.eligiblePill}>
                <Text style={styles.eligibleText}>✨ ELIGIBLE TO BE NOMINATED</Text>
              </View>
            )}
          </View>
        </View>

        {supabaseConfigured && userId && (
          <View style={styles.balanceCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.balanceLabel}>Available to cash out</Text>
              <Text style={styles.balanceValue}>
                {wallet ? formatDollars(wallet.balanceCents) : "—"}
              </Text>
            </View>
            <Pressable
              style={[
                styles.cashoutBtn,
                (!wallet || wallet.balanceCents < 100 || cashoutBusy) && styles.cashoutBtnDisabled,
              ]}
              disabled={!wallet || wallet.balanceCents < 100 || cashoutBusy}
              onPress={onCashout}
            >
              {cashoutBusy ? (
                <ActivityIndicator color={colors.green} />
              ) : (
                <Text style={styles.cashoutBtnText}>
                  {!wallet?.connectReady && (wallet?.balanceCents ?? 0) >= 100
                    ? "Set up payout"
                    : "Cash out"}
                </Text>
              )}
            </Pressable>
          </View>
        )}
        {cashoutMsg && <Text style={styles.cashoutMsg}>{cashoutMsg}</Text>}

        <View style={styles.stats}>
          <Stat label="Given" value={`$${ME.given}`} sub="this year" />
          <Stat label="Nominated" value={`${ME.nominated}`} sub="people" />
          <Stat label="Received" value={receivedDisplay} sub="so far" />
        </View>

        <View style={styles.tabSwitcher}>
          <Pressable
            style={[styles.tabBtn, tab === "noms" && styles.tabBtnActive]}
            onPress={() => setTab("noms")}
          >
            <Text style={[styles.tabBtnText, tab === "noms" && { opacity: 1 }]}>Your nominations</Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, tab === "giving" && styles.tabBtnActive]}
            onPress={() => setTab("giving")}
          >
            <Text style={[styles.tabBtnText, tab === "giving" && { opacity: 1 }]}>Your giving</Text>
          </Pressable>
        </View>

        {tab === "noms" ? (
          <View style={{ gap: 10 }}>
            {MY_NOMINATIONS.map((m) => (
              <View key={m.id} style={styles.nomCard}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View>
                    <Text style={styles.nomName}>
                      {m.cat.emoji} {m.name}
                    </Text>
                    <Text style={styles.nomRole}>{m.role}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      m.complete ? styles.pillComplete : styles.pillLive,
                    ]}
                  >
                    <Text style={[styles.pillText, m.complete ? { color: "#7ED48A" } : { color: colors.marigold }]}>
                      {m.complete ? "COMPLETE" : `${m.daysLeft}d LEFT`}
                    </Text>
                  </View>
                </View>
                <View style={{ marginTop: 12, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
                  <Text style={styles.backersBig}>
                    {m.backers}
                    <Text style={styles.backersLbl}> friends piled on</Text>
                  </Text>
                  <Text style={styles.raisedSmall}>${m.raised} so far</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View>
            {MY_GIVES.map((g) => (
              <View key={g.id} style={styles.giveRow}>
                <View style={styles.giveEmo}>
                  <Text style={{ fontSize: 16 }}>{g.cat.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.giveName}>{g.name}</Text>
                  <Text style={styles.giveMeta}>
                    {g.when} · {g.cat.title}
                  </Text>
                </View>
                <Text style={styles.giveAmount}>${g.amount.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fonts.serifHeavy,
    fontSize: 30,
    color: "#fff",
  },
  name: {
    fontFamily: fonts.serifSemi,
    fontSize: 24,
    color: colors.cream,
  },
  memberSince: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.cream,
    opacity: 0.7,
  },
  eligiblePill: {
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: "rgba(255,185,0,0.2)",
    borderRadius: 999,
  },
  eligibleText: {
    color: colors.marigold,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.44,
  },
  balanceCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(248,249,244,0.1)",
    borderWidth: 1,
    borderColor: "rgba(248,249,244,0.14)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  balanceLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.cream,
    opacity: 0.65,
  },
  balanceValue: {
    fontFamily: fonts.serifBold,
    fontSize: 28,
    color: colors.marigold,
    marginTop: 2,
  },
  cashoutBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.marigold,
    minWidth: 108,
    alignItems: "center",
  },
  cashoutBtnDisabled: {
    opacity: 0.45,
  },
  cashoutBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.green,
  },
  cashoutMsg: {
    marginTop: 10,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.cream,
    opacity: 0.85,
  },
  stats: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 22,
  },
  stat: {
    flex: 1,
    padding: 16,
    backgroundColor: "rgba(248,249,244,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(248,249,244,0.12)",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    color: colors.cream,
    opacity: 0.6,
    fontFamily: fonts.bodyBold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  statValue: {
    fontFamily: fonts.serifBold,
    fontSize: 24,
    color: colors.marigold,
    marginTop: 4,
  },
  statSub: {
    fontSize: 10,
    opacity: 0.55,
    color: colors.cream,
    marginTop: 2,
  },
  tabSwitcher: {
    flexDirection: "row",
    gap: 2,
    backgroundColor: "rgba(248,249,244,0.06)",
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: "rgba(248,249,244,0.12)",
  },
  tabBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.cream,
    opacity: 0.6,
  },
  nomCard: {
    padding: 14,
    backgroundColor: "rgba(248,249,244,0.06)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(248,249,244,0.1)",
  },
  nomName: {
    fontFamily: fonts.serifBold,
    fontSize: 17,
    color: colors.cream,
  },
  nomRole: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.cream,
    opacity: 0.7,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillLive: {
    backgroundColor: "rgba(255,185,0,0.2)",
  },
  pillComplete: {
    backgroundColor: "rgba(83,162,104,0.25)",
  },
  pillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.44,
  },
  backersBig: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    color: colors.marigold,
  },
  backersLbl: {
    fontSize: 13,
    opacity: 0.55,
    fontFamily: fonts.body,
    color: colors.cream,
  },
  raisedSmall: {
    fontFamily: fonts.body,
    fontSize: 11,
    opacity: 0.7,
    color: colors.cream,
  },
  giveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(248,249,244,0.1)",
  },
  giveEmo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(248,249,244,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  giveName: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.cream,
  },
  giveMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.cream,
    opacity: 0.6,
    marginTop: 2,
  },
  giveAmount: {
    fontFamily: fonts.serifBold,
    color: colors.marigold,
    fontSize: 15,
  },
});
