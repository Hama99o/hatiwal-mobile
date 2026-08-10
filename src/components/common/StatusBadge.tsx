import { View } from "react-native";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { getStatusAccent } from "./statusAccent";

export type ListingStatus = "draft" | "active" | "reserved" | "sold";

interface StatusBadgeProps {
  status: ListingStatus;
  /**
   * overlay — renders as a full-width strip pinned to the bottom of a
   * thumbnail container. The parent must have `position: relative` /
   * `overflow: hidden`. Used in ConversationRow and ListingCard overlays.
   */
  overlay?: boolean;
}

/**
 * StatusBadge — maps listing status to semantic color tokens from useColors().
 *
 * Token mapping (from DESIGN_SYSTEM.md §2):
 *   draft    → muted / mutedForeground  (grey — not yet published)
 *   active   → successAlpha bg / success text  (green — live)
 *   reserved → warningAlpha bg / warning text  (amber — held for buyer)
 *   sold     → secondary / secondaryForeground  (grey — archived)
 *
 * overlay mode:
 *   sold     → colors.overlay (translucent black, rgba(0,0,0,0.5))
 *   reserved → colors.reservedOverlay (translucent amber, rgba(180,83,9,0.85))
 */
export function StatusBadge({ status, overlay = false }: StatusBadgeProps) {
  const { t } = useTranslation();
  const colors = useColors();

  if (overlay) {
    // Only relevant for sold / reserved — do not render for draft / active
    if (status !== "sold" && status !== "reserved") return null;

    const bgColor =
      status === "sold" ? colors.overlay : colors.reservedOverlay;

    return (
      <View
        style={{
          position:        "absolute",
          bottom:          0,
          left:            0,
          right:           0,
          backgroundColor: bgColor,
          paddingVertical: 2,
          alignItems:      "center",
        }}
        accessibilityRole="text"
      >
        <Text
          style={{
            fontSize:      9,
            fontWeight:    "800",
            color:         colors.primaryForeground,
            letterSpacing: 0.5,
          }}
        >
          {t(`listing.status.${status}`).toUpperCase()}
        </Text>
      </View>
    );
  }

  // Single shared status->colour map (TASK-K729 dedup) — see statusAccent.ts.
  const accent = getStatusAccent(status, colors);

  return (
    <View
      style={{
        backgroundColor:  accent.bg,
        borderRadius:     999,
        paddingHorizontal: 8,
        paddingVertical:  2,
        alignSelf:        "flex-start",
      }}
      accessibilityRole="text"
    >
      <Text
        style={{ color: accent.text, fontSize: 11, fontWeight: "600" }}
        numberOfLines={1}
      >
        {t(`listing.status.${status}`)}
      </Text>
    </View>
  );
}
