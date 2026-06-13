import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { useModeStore } from "@/stores/mode.store";
import { ShoppingBag, MessageCircle, Package, User, Heart } from "lucide-react-native";

export default function TabsLayout() {
  const { t } = useTranslation();
  const colors = useColors();
  const { mode } = useModeStore();

  const isSeller = mode === "seller";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: isSeller ? colors.warning : colors.border,
          borderTopWidth: isSeller ? 2 : 1,
        },
        tabBarActiveTintColor: isSeller ? colors.warning : colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
      }}
    >
      {/* Browse — visible only in buyer mode */}
      <Tabs.Screen
        name="browse"
        options={{
          href: isSeller ? null : undefined,
          title: t("sidebar.browse"),
          tabBarIcon: ({ color, size }) => <ShoppingBag size={size} color={color} />,
        }}
      />

      {/* My Listings — visible only in seller mode */}
      <Tabs.Screen
        name="my-listings"
        options={{
          href: isSeller ? undefined : null,
          title: t("sidebar.myListings"),
          tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
        }}
      />

      {/* Saved — buyer mode only */}
      <Tabs.Screen
        name="saved"
        options={{
          href: isSeller ? null : undefined,
          title: t("sidebar.saved"),
          tabBarIcon: ({ color, size, focused }) => (
            <Heart size={size} color={color} fill={focused ? color : "transparent"} />
          ),
        }}
      />

      {/* Chat — always visible */}
      <Tabs.Screen
        name="chat"
        options={{
          title: t("sidebar.chat"),
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
        }}
      />

      {/* Profile — always visible */}
      <Tabs.Screen
        name="profile"
        options={{
          title: t("sidebar.profile"),
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
