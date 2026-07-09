/**
 * EmptyState — shared empty-state component for every list surface.
 *
 * Two display modes:
 *   - illustration (preferred for the 4 high-frequency surfaces): pass an inline
 *     react-native-svg node via the `illustration` prop. The container is rendered
 *     without the muted circle background so the SVG art fills the space cleanly.
 *   - icon (fallback for all other callers): pass a Lucide `icon` component as before.
 *     The muted circle background is kept so the icon reads well.
 *
 * Animation:
 *   The illustration/icon container animates in with FadeIn + scale 0.8→1.0 via
 *   react-native-reanimated on mount. When `useReduceMotion()` returns true the
 *   entering animation is skipped entirely (the view appears instantly).
 *
 * Color:
 *   All colors via useColors() — no hardcoded hex. The illustration SVGs pull
 *   their own colors from useColors() as well, so they are always theme-correct.
 */

import React from "react";
import { View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { useColors } from "@/hooks/useColors";
import { useReduceMotion } from "@/lib/animation/useReduceMotion";

interface LucideIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

type IconComponent = React.ComponentType<LucideIconProps>;

interface EmptyStateAction {
  label: string;
  onPress: () => void;
}

interface EmptyStateProps {
  /**
   * Lucide icon component — shown in a muted circle.
   * Used when `illustration` is not provided. Required for the fallback path.
   */
  icon?: IconComponent;

  /**
   * Inline SVG illustration node — replaces the icon + muted circle.
   * Use one of the components from `src/components/common/empty-illustrations/`.
   * When provided, `icon` is ignored.
   */
  illustration?: React.ReactNode;

  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
  /**
   * Compact mode — for an EmptyState embedded inside a larger scrollable
   * screen (e.g. the "Ratings & Reviews" preview on a profile header) rather
   * than owning the whole screen. Shrinks padding/icon/type so it reads as
   * one calm section among others instead of a big blank void that could
   * look broken. Full-screen list callers (Browse, Saved, My Listings, Chat)
   * are unaffected — default is false.
   */
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();

  // When reduce-motion is active, skip the entering animation entirely
  // by passing undefined — Reanimated will not run any transform/opacity.
  const enteringAnimation = reduceMotion
    ? undefined
    : FadeIn.duration(300).delay(40);

  const scaleAnimation = reduceMotion
    ? undefined
    : ZoomIn.duration(350).delay(20).springify().damping(14).stiffness(120);

  const iconCircleSize = compact ? 48 : 72;

  return (
    <View
      style={{
        flex: compact ? undefined : 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: compact ? 16 : 32,
        paddingVertical: compact ? 24 : 64,
        gap: compact ? 10 : 16,
      }}
    >
      {/* Illustration or icon — animates in on mount */}
      <Animated.View
        entering={scaleAnimation}
        style={{ alignItems: "center", justifyContent: "center", marginBottom: compact ? 2 : 8 }}
      >
        {illustration ? (
          // Custom SVG illustration — no muted circle background, art fills the space
          illustration
        ) : Icon ? (
          // Fallback: Lucide icon in muted pill (original behaviour, unchanged)
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              width: iconCircleSize,
              height: iconCircleSize,
              borderRadius: iconCircleSize / 2,
              backgroundColor: colors.muted,
            }}
          >
            <Icon size={compact ? 22 : 34} color={colors.mutedForeground} strokeWidth={1.5} />
          </View>
        ) : null}
      </Animated.View>

      {/* Title + description — fade in slightly after the illustration */}
      <Animated.View
        entering={enteringAnimation}
        style={{ alignItems: "center", gap: compact ? 4 : 8 }}
      >
        <Text
          style={{
            color: colors.foreground,
            fontSize: compact ? 15 : 18,
            fontWeight: "600",
            textAlign: "center",
          }}
        >
          {title}
        </Text>

        {description ? (
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: compact ? 13 : 14,
              textAlign: "center",
              lineHeight: compact ? 18 : 20,
            }}
          >
            {description}
          </Text>
        ) : null}
      </Animated.View>

      {action ? (
        <Animated.View entering={enteringAnimation}>
          <Button
            variant="default"
            size="default"
            onPress={action.onPress}
            style={{ marginTop: 8, paddingHorizontal: 24 }}
            accessibilityLabel={action.label}
          >
            <Text style={{ fontSize: 14, fontWeight: "600" }}>
              {action.label}
            </Text>
          </Button>
        </Animated.View>
      ) : null}
    </View>
  );
}
