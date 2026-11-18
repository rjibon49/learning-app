import React from "react";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, FONTS } from "../../styles/theme";

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(active: IconName, inactive: IconName) {
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? active : inactive} size={24} color={color as string} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarLabelStyle: { fontFamily: FONTS.bodySemi, fontSize: 12 },
        tabBarStyle: { borderTopColor: COLORS.border, backgroundColor: COLORS.surface },
        sceneStyle: { backgroundColor: COLORS.ground },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: tabIcon("home", "home-outline") }} />
      <Tabs.Screen name="learn" options={{ title: "Learn", tabBarIcon: tabIcon("book", "book-outline") }} />
      <Tabs.Screen name="practice" options={{ title: "Practice", tabBarIcon: tabIcon("albums", "albums-outline") }} />
      <Tabs.Screen name="progress" options={{ title: "Progress", tabBarIcon: tabIcon("bar-chart", "bar-chart-outline") }} />
    </Tabs>
  );
}
