import React from "react";
import { View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { AnimatedPressable } from "@/lib/animation";

/**
 * JumpToLatestButton — "come back to the newest message" for a scrolled-up thread.
 *
 * Owner request, 2026-09-02: "when we scroll very up and we want to come the
 * last message, it should show come to bottom or latest message… user should not
 * [have to scroll it themselves]".
 *
 * Deliberately NOT another hand-rolled floating button: it is built from
 * `AnimatedPressable` (haptics + press scale) and `useColors`, the same pair
 * every other control in this app uses, so it inherits the press feel and both
 * themes rather than inventing a third look.
 *
 * Positioning is the CALLER's job (`bottom`), because only the thread knows how
 * tall its composer bar currently is — and that bar's height is exactly what
 * this app got wrong when it tried to guess it. See Conversation.tsx.
 */
export interface JumpToLatestButtonProps {
  onPress: () => void;
  /** Distance from the bottom of the screen, in px. Usually bar height + gap. */
  bottom: number;
  /** Shown as a count pill when the user has scrolled past unread messages. */
  unreadCount?: number;
  /** "Jump to latest" — translated by the caller. */
  label: string;
  /** RTL mirrors which side the pill sits on. */
  isRtl?: boolean;
  testID?: string;
}

export function JumpToLatestButton({
  onPress,
  bottom,
  unreadCount = 0,
  label,
  isRtl = false,
  testID = "jump-to-latest",
}: JumpToLatestButtonProps) {
  const colors = useColors();
  const hasUnread = unreadCount > 0;

  return (
    <View
      // Sits ABOVE the composer bar, aligned to the reading direction's end.
      // pointerEvents box-none so the thread behind it stays scrollable
      // everywhere the pill itself is not.
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom,
        alignItems: isRtl ? "flex-start" : "flex-end",
        paddingHorizontal: 14,
      }}
    >
      <AnimatedPressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        testID={testID}
        style={{
          flexDirection: isRtl ? "row-reverse" : "row",
          alignItems: "center",
          // `gap`, not a margin on the icon — a directional margin on a manually
          // reversed row lands on the wrong side (the ps/fa defect fixed across
          // six sites on 2026-09-02).
          gap: 6,
          minHeight: 44,
          paddingHorizontal: hasUnread ? 14 : 12,
          borderRadius: 22,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          // A real elevation, so it reads as floating above the thread rather
          // than as a bubble inside it.
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        }}
      >
        <ChevronDown size={18} color={hasUnread ? colors.primary : colors.mutedForeground} />
        {hasUnread ? (
          <Text
            className="text-xs font-semibold"
            style={{ color: colors.primary }}
            testID="jump-to-latest-count"
          >
            {String(unreadCount)}
          </Text>
        ) : null}
      </AnimatedPressable>
    </View>
  );
}
