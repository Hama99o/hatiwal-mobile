import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { BackButton } from "@/components/common/BackButton";
import { useReduceMotion } from "@/lib/animation/useReduceMotion";
import { useNotificationObserver } from "@/lib/notifications";

export default function MainLayout() {
  const { t } = useTranslation();
  const colors = useColors();
  const router = useRouter();
  const reduceMotion = useReduceMotion();

  // Opens the right conversation when a message push notification is tapped
  // (handles both cold-start and while-running taps).
  useNotificationObserver();

  const stackAnimation = reduceMotion ? "none" : "slide_from_right";

  const themedHeader = {
    headerStyle: { backgroundColor: colors.card },
    headerTintColor: colors.primary,
    headerTitleStyle: { color: colors.foreground, fontWeight: "500" as const, fontSize: 15 },
    headerShadowVisible: false,
    headerBackTitle: "",
  };

  return (
    <Stack screenOptions={{ headerShown: false, animation: stackAnimation }}>
      <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
      <Stack.Screen name="listing/new" />
      <Stack.Screen name="listing/edit/[id]" />
      <Stack.Screen
        name="conversation/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="listing-conversations/[id]"
        options={{
          // The screen renders its own header (listing title + back button),
          // so hide the native one — otherwise it stacks a second, ugly header
          // showing the raw route name "listing-conversations/[id]".
          headerShown: false,
          ...themedHeader,
        }}
      />
      <Stack.Screen
        name="seller/[userId]"
        options={{
          headerShown: false,
          ...themedHeader,
        }}
      />
      <Stack.Screen
        name="my-listings/[id]"
        options={{
          headerShown: false,
          ...themedHeader,
        }}
      />
      <Stack.Screen
        name="profile/edit"
        options={{
          headerShown: true,
          headerTitle: t("profile.edit.title"),
          headerLeft: () => (
            <BackButton
              onPress={() => router.push("/(main)/(tabs)/profile" as any)}
            />
          ),
          ...themedHeader,
        }}
      />
      <Stack.Screen
        name="blocked-users"
        options={{
          headerShown: true,
          headerTitle: t("profile.blockedUsers"),
          headerLeft: () => (
            <BackButton
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace("/(main)/(tabs)/profile" as any);
              }}
            />
          ),
          ...themedHeader,
        }}
      />
    </Stack>
  );
}
