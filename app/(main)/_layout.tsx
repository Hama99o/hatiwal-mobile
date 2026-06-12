import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function MainLayout() {
  const { t } = useTranslation();

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
          headerBackTitle: t("common.back"),
        }}
      />
    </Stack>
  );
}
