import { Tabs, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useModeStore } from "@/stores/mode.store";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore } from "@/stores/chat.store";
import { Store, MessageCircle, Package, User, Heart, LogIn, LayoutGrid } from "lucide-react-native";
import { FloatingTabBar } from "@/components/common/FloatingTabBar";

export default function TabsLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const { mode } = useModeStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

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
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      {/* Home tab — the single always-visible landing tab (index 0, so it is the
          tab focused on a cold start / reload, which is why its active highlight
          works reliably). Its content + label flip by mode: a seller sees
          "My Shop" (browse.tsx renders MyListings for sellers); a buyer/guest
          sees "Bazaar" (the feed). Keeping ONE home tab — instead of a hidden
          browse + a separate my-listings tab — is what makes the bottom-bar
          highlight correct for sellers on reload. */}
      <Tabs.Screen
        name="browse"
        options={{
          title: isSeller ? t("sidebar.myListings") : t("sidebar.browse"),
          tabBarIcon: ({ color, size }) =>
            isSeller ? <Package size={size} color={color} /> : <Store size={size} color={color} />,
        }}
      />

      {/* Categories hub — a BUYER-only tab right after the home tab (browse by
          category is a buyer activity; sellers manage their shop, so it is
          hidden in seller mode). Guests still see it so they can browse. */}
      <Tabs.Screen
        name="categories"
        options={{
          href: isSeller ? null : undefined,
          title: t("sidebar.categories"),
          tabBarIcon: ({ color, size }) => <LayoutGrid size={size} color={color} />,
        }}
      />

      {/* My Listings route still exists (reached from Profile / post-create
          flows) but its TAB is always hidden — the home tab above is the
          seller's My Shop. A visible duplicate here would sit unfocused on
          cold-load and break the active-tab highlight. */}
      <Tabs.Screen
        name="my-listings"
        options={{
          href: null,
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
              ? unreadMessageTotal >= 99 ? "99+" : unreadMessageTotal
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
