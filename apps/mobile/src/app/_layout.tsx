import React, { useEffect } from "react";
import { Stack } from "expo-router";
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
import { COLORS, FONTS } from "../styles/theme";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const { user, loading } = useLearnerAuth();
  const signedIn = Boolean(user);

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
      </Stack.Protected>

      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
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
