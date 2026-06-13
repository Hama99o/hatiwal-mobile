import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";

export default function MainLayout() {
  const { t } = useTranslation();
  const colors = useColors();

  const themedHeader = {
    headerStyle: { backgroundColor: colors.card },
    headerTintColor: colors.primary,
    headerTitleStyle: { color: colors.foreground },
    headerShadowVisible: false,
    headerBackTitle: t("common.back"),
  };

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="listing/new" />
      <Stack.Screen name="listing/edit/[id]" />
      <Stack.Screen
        name="conversation/[id]"
        options={{
          headerShown: true,
          headerTitle: t("chat.title"),
          ...themedHeader,
        }}
      />
      <Stack.Screen
        name="listing-conversations/[id]"
        options={{
          headerShown: true,
          ...themedHeader,
        }}
      />
      <Stack.Screen
        name="seller/[userId]"
        options={{
          headerShown: true,
          headerTitle: t("profile.sellerProfile.title"),
          ...themedHeader,
        }}
      />
    </Stack>
  );
}
