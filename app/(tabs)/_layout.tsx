import { Tabs, usePathname, useRouter } from "expo-router";
import React from "react";
import { TabBar } from "../../components/TabBar";

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const active =
    pathname.includes("feed") || pathname.endsWith("/(tabs)") || pathname === "/"
      ? "home"
      : pathname.includes("discover")
      ? "discover"
      : pathname.includes("profile")
      ? "profile"
      : "home";

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={() => (
        <TabBar
          active={active as any}
          onGo={(t) => {
            if (t === "give-start") router.push("/nominate/who");
            else if (t === "home") router.push("/(tabs)/feed");
            else if (t === "discover") router.push("/(tabs)/discover");
            else router.push("/(tabs)/profile");
          }}
        />
      )}
    >
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
