import { Tabs, usePathname, useRouter } from "expo-router";
import React from "react";
import { TabBar } from "../../components/TabBar";
import { useSession } from "../../lib/session";

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { userId, loading } = useSession();
  const active = pathname.includes("profile") ? "profile" : "home";

  const goAuthed = (path: string, next: string) => {
    if (loading) return;
    if (!userId) {
      router.push({ pathname: "/auth", params: { next } });
      return;
    }
    router.push(path as any);
  };

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={() => (
        <TabBar
          active={active}
          onGo={(t) => {
            if (t === "give-start") goAuthed("/start/who", "start");
            else if (t === "home") goAuthed("/(tabs)/feed", "feed");
            else goAuthed("/(tabs)/profile", "profile");
          }}
        />
      )}
    >
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
