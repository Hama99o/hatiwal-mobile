/**
 * FloatingTabBar — Hatiwal's custom bottom navigation.
 *
 * A rounded "pill" bar that floats above the screen bottom (detached from the
 * edges, with a soft shadow) instead of the stock edge-to-edge tab bar. Every
 * tab shows its icon over a small label (Apple-News style); the active tab is
 * tinted with the accent color and sits in a soft accent-tinted pill. This
 * gives the app a distinct, non-generic navigation look while keeping every
 * behaviour the previous bar had:
 *
 *   • Hidden tabs (Expo Router sets `options.href = null`) are not rendered, so
 *     buyer/seller/guest visibility logic in the layout still drives the bar.
 *   • Seller mode swaps the accent from buyer-blue `primary` → emerald `seller`
 *     (and adds a subtle seller-tinted outline) so the mode is always legible.
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

// Extra breathing room ABOVE the system nav bar / home indicator so the
// floating pill never sits flush against it. Devices with a system nav bar
// (Android 3-button/gesture bar, iOS home indicator) report a non-zero
// `insets.bottom` — we add this on top of that inset, we don't replace it,
// otherwise the bar's bottom edge lands exactly on the nav bar's top edge
// with zero visible gap. Devices with no system nav bar just get the flat
// 12px fallback (no giant gap).
const SAFE_AREA_GAP = 8;

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useColors();
  const { isRtl } = useLocalization();
  const insets = useSafeAreaInsets();
  const isSeller = useModeStore((s) => s.mode) === "seller";

  // Buyer → blue `primary`; seller → emerald `seller`. The soft alpha tint sits
  // behind the active tab so the current screen + the active role are both clear.
  const accent = isSeller ? colors.seller : colors.primary;
  const accentAlpha = isSeller ? colors.sellerAlpha : colors.primaryAlpha;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.background,
          paddingBottom: insets.bottom > 0 ? insets.bottom + SAFE_AREA_GAP : 12,
        },
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.card,
            // Subtle seller-tinted outline in seller mode; hairline otherwise.
            borderColor: isSeller ? accent : colors.border,
            borderWidth: isSeller ? 1.5 : StyleSheet.hairlineWidth,
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
          // Icon + label tint: accent when active, muted otherwise (Apple-News style).
          const contentColor = isFocused ? accent : colors.mutedForeground;

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
              // A stable, locale-independent handle for each tab.
              //
              // This bar REPLACES react-navigation's own BottomTabBar, so the
              // `tabBarButtonTestID` option declared per screen in
              // app/(main)/(tabs)/_layout.tsx is never read by anything unless it
              // is honoured HERE — setting it in the options alone is a no-op, as
              // a device hierarchy dump confirmed (the tab buttons had an
              // accessibility label and no resource-id at all).
              //
              // The fallback matters as much as the option: every tab label is
              // translated, and two of them change with mode ("Bazaar" for a
              // buyer, "My Shop" for a seller), so a flow that taps a tab by its
              // text is tied to English AND to the current role.
              testID={
                (options as { tabBarButtonTestID?: string }).tabBarButtonTestID
                ?? `${route.name}-tab`
              }
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.item}
            >
              <View
                style={[
                  styles.itemInner,
                  // Active tab sits in a soft accent-tinted pill.
                  isFocused ? { backgroundColor: accentAlpha } : null,
                ]}
              >
                <View>
                  {options.tabBarIcon?.({
                    focused: isFocused,
                    color: contentColor,
                    size: ICON_SIZE,
                  })}
                  {badge != null && badge !== "" ? (
                    <View style={[styles.badge, { backgroundColor: colors.destructive, borderColor: colors.card }]}>
                      <Text style={[styles.badgeText, { color: colors.destructiveForeground }]} numberOfLines={1}>
                        {typeof badge === "number" && badge > 99 ? "99+" : String(badge)}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text
                  numberOfLines={1}
                  style={[
                    styles.label,
                    { color: contentColor, fontWeight: isFocused ? "700" : "500" },
                  ]}
                >
                  {label}
                </Text>
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
    minHeight: 64,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    paddingVertical: 6,
    // Soft floating shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 10,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  itemInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 18,
    minWidth: 54,
  },
  label: {
    fontSize: 10.5,
    maxWidth: 76,
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
