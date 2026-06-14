import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { TouchableOpacity } from "react-native";
import { ChevronLeft } from "lucide-react-native";

export default function MainLayout() {
  const { t } = useTranslation();
  const colors = useColors();
  const router = useRouter();

  const themedHeader = {
    headerStyle: { backgroundColor: colors.card },
    headerTintColor: colors.primary,
    headerTitleStyle: { color: colors.foreground, fontWeight: "500", fontSize: 15 },
    headerShadowVisible: false,
    headerBackTitle: "",
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
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.push("/(main)/(tabs)/chat" as any)}
              hitSlop={8}
              style={{ paddingLeft: 12 }}
            >
              <ChevronLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
          ...themedHeader,
        }}
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
    </Stack>
  );
}
