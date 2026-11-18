import React from "react";
import { Stack } from "expo-router";

import { COLORS, FONTS } from "../../styles/theme";

export const unstable_settings = {
  initialRouteName: "login",
};

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: COLORS.ground },
        headerTintColor: COLORS.ink,
        headerTitleStyle: { fontFamily: FONTS.title },
        contentStyle: { backgroundColor: COLORS.ground },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: "Create account" }} />
      <Stack.Screen name="verify-email" options={{ title: "Verify email" }} />
      <Stack.Screen name="forgot-password" options={{ title: "Forgot password" }} />
      <Stack.Screen name="reset-password" options={{ title: "Reset password" }} />
    </Stack>
  );
}
