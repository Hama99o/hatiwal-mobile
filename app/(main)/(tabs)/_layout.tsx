import { Tabs, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { useModeStore } from "@/stores/mode.store";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore } from "@/stores/chat.store";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ShoppingBag, MessageCircle, Package, User, Heart, LogIn } from "lucide-react-native";

export default function TabsLayout() {
  const { t } = useTranslation();
  const colors = useColors();
  const router = useRouter();
  const { mode } = useModeStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const insets = useSafeAreaInsets();

  const isSeller = mode === "seller";
  const unreadMessageTotal = useChatStore((s) => s.unreadMessageTotal);

  // A logged-out guest gets a deliberately minimal bar — just Browse + Login —
  // instead of the full logged-in set (Saved/Messages/Profile) that would only
  // bounce them to the login screen. The last tab flips between Profile (signed
  // in) and a clear Login call-to-action (guest).
  const goToLogin = (returnTo: string) => ({
    tabPress: (e: { preventDefault: () => void }) => {
      if (!isAuthenticated) {
        e.preventDefault();
        router.push({ pathname: "/(auth)/login", params: { returnTo } });
      }
    },
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: isSeller ? colors.warning : colors.border,
          borderTopWidth: isSeller ? 2 : 1,
          paddingBottom: insets.bottom,
          height: 49 + insets.bottom,
        },
        tabBarActiveTintColor: isSeller ? colors.warning : colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
      }}
    >
      {/* Browse — the feed; visible to guests and to buyers (hidden in seller mode) */}
      <Tabs.Screen
        name="browse"
        options={{
          href: isSeller ? null : undefined,
          title: t("sidebar.browse"),
          tabBarIcon: ({ color, size }) => <ShoppingBag size={size} color={color} />,
        }}
      />

      {/* My Listings — signed-in seller mode only */}
      <Tabs.Screen
        name="my-listings"
        options={{
          href: isAuthenticated && isSeller ? undefined : null,
          title: t("sidebar.myListings"),
          tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
        }}
      />

      {/* Saved — signed-in buyer mode only (hidden for guests) */}
      <Tabs.Screen
        name="saved"
        options={{
          href: isAuthenticated && !isSeller ? undefined : null,
          title: t("sidebar.saved"),
          tabBarIcon: ({ color, size, focused }) => (
            <Heart size={size} color={color} fill={focused ? color : "transparent"} />
          ),
        }}
      />

      {/* Messages — signed-in only (hidden for guests) */}
      <Tabs.Screen
        name="chat"
        options={{
          href: isAuthenticated ? undefined : null,
          title: t("sidebar.chat"),
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
          tabBarBadge:
            isAuthenticated && unreadMessageTotal > 0
              ? unreadMessageTotal
              : undefined,
        }}
      />

      {/* Profile (signed in) ↔ Login (guest) — the second of the two guest tabs */}
      <Tabs.Screen
        name="profile"
        options={{
          title: isAuthenticated ? t("sidebar.profile") : t("auth.login"),
          tabBarIcon: ({ color, size }) =>
            isAuthenticated ? (
              <User size={size} color={color} />
            ) : (
              <LogIn size={size} color={color} />
            ),
        }}
        listeners={goToLogin("/(main)/(tabs)/profile")}
      />
    </Tabs>
  );
}
