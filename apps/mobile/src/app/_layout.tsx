import React, { useEffect } from "react";
import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from "@expo-google-fonts/nunito";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";

import { AuthProvider, useLearnerAuth } from "../lib/auth-context";
import { loadContentLanguage } from "../lib/content-language";
import { COLORS, FONTS } from "../styles/theme";
import { setAnalyticsUser, trackScreen } from "../lib/analytics";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
void loadContentLanguage();

function RootNavigator() {
  const { user, loading } = useLearnerAuth();
  const signedIn = Boolean(user);
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) trackScreen(pathname);
  }, [pathname, loading]);

  useEffect(() => {
    if (!loading) setAnalyticsUser(user?.id ? String(user.id) : null);
  }, [user?.id, loading]);

  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync().catch(() => undefined);
  }, [loading]);

  // Keep the splash screen up while the saved session is restored.
  if (loading) return null;

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.ink,
        headerTitleStyle: { fontFamily: FONTS.title },
        contentStyle: { backgroundColor: COLORS.ground },
        animation: "slide_from_right",
      }}
    >
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="lesson/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="review" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="quiz/[id]" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="delete-account" options={{ headerShown: false }} />
        <Stack.Screen name="word/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="settings/index" options={{ headerShown: false }} />
        <Stack.Screen name="settings/profile" options={{ headerShown: false }} />
        <Stack.Screen name="settings/password" options={{ headerShown: false }} />
        <Stack.Screen name="settings/language" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack.Protected>

      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>

      {/* Open with or without an account (linked from sign up). */}
      <Stack.Screen name="legal/[doc]" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // A font that fails to load falls back to the system font; do not block the app.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
