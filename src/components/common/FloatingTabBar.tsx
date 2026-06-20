/**
 * FloatingTabBar — Hatiwal's custom bottom navigation.
 *
 * A rounded "pill" bar that floats above the screen bottom (detached from the
 * edges, with a soft shadow) instead of the stock edge-to-edge tab bar. The
 * active tab expands into a filled accent pill showing its icon + label; the
 * rest show icon-only. This gives the app a distinct, non-generic navigation
 * look while keeping every behaviour the previous bar had:
 *
 *   • Hidden tabs (Expo Router sets `options.href = null`) are not rendered, so
 *     buyer/seller/guest visibility logic in the layout still drives the bar.
 *   • Seller mode swaps the accent from primary → warning (and adds a subtle
 *     warning outline) so the mode is always legible.
 *   • The chat unread badge (`options.tabBarBadge`) renders on the icon.
 *   • Guest login-redirect listeners still fire — onPress emits a cancelable
 *     `tabPress`, so a screen listener can preventDefault and redirect.
 *   • RTL: the row reverses for Pashto / Dari.
 *
 * Colors come only from useColors(); no hardcoded hex except the shadow.
 */

import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { useModeStore } from "@/stores/mode.store";

const ICON_SIZE = 22;

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useColors();
  const { isRtl } = useLocalization();
  const insets = useSafeAreaInsets();
  const isSeller = useModeStore((s) => s.mode) === "seller";

  const accent = isSeller ? colors.warning : colors.primary;
  const accentFg = isSeller ? colors.warningForeground : colors.primaryForeground;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.background,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
        },
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.card,
            borderColor: isSeller ? accent : colors.border,
            borderWidth: isSeller ? 1.5 : 1,
            flexDirection: isRtl ? "row-reverse" : "row",
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];

          // Expo Router compiles `href: null` (used in _layout to hide a tab for
          // the current auth/mode — e.g. My Shop / Saved / Chats for guests) into
          // `tabBarItemStyle: { display: "none" }` and strips `options.href`. So we
          // must detect hidden tabs via that style, NOT via href. Missing this lets
          // guest-forbidden tabs render. (Also keep the href check as a fallback.)
          const itemStyle = options.tabBarItemStyle as { display?: string } | undefined;
          const isHidden =
            (itemStyle && !Array.isArray(itemStyle) && itemStyle.display === "none") ||
            (options as { href?: string | null }).href === null;
          if (isHidden) return null;

          const isFocused = state.index === index;
          const label =
            typeof options.title === "string" ? options.title : route.name;
          const badge = options.tabBarBadge;
          const contentColor = isFocused ? accentFg : colors.mutedForeground;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            // Respects screen-level listeners (e.g. the guest login redirect).
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={label}
              onPress={onPress}
              onLongPress={onLongPress}
              // The focused tab grows so its icon + label pill never clips,
              // even with four tabs on a narrow screen.
              style={[styles.item, { flexGrow: isFocused ? 1.7 : 1 }]}
            >
              <View
                style={[
                  styles.itemInner,
                  {
                    flexDirection: isRtl ? "row-reverse" : "row",
                    backgroundColor: isFocused ? accent : "transparent",
                    paddingHorizontal: isFocused ? 14 : 0,
                  },
                ]}
              >
                <View>
                  {options.tabBarIcon?.({
                    focused: isFocused,
                    color: contentColor,
                    size: ICON_SIZE,
                  })}
                  {badge != null && badge !== "" ? (
                    <View style={[styles.badge, { backgroundColor: colors.warning, borderColor: colors.card }]}>
                      <Text style={[styles.badgeText, { color: colors.warningForeground }]} numberOfLines={1}>
                        {typeof badge === "number" && badge > 99 ? "99+" : String(badge)}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {isFocused ? (
                  <Text
                    numberOfLines={1}
                    style={[styles.label, { color: accentFg }]}
                  >
                    {label}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 8,
    paddingHorizontal: 14,
  },
  bar: {
    height: 60,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 6,
    // Soft floating shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  item: {
    flexBasis: 0,
    flexShrink: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  itemInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 22,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    maxWidth: 92,
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
});
