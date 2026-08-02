import { Stack } from "expo-router";
import React from "react";

export default function StartLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "#F8F9F4" },
      }}
    />
  );
}
