import { View } from "react-native";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { getStatusAccent } from "./statusAccent";
import { withAlpha } from "@/lib/color";

export type ListingStatus = "draft" | "active" | "reserved" | "sold";

interface StatusBadgeProps {
  status: ListingStatus;
  /**
   * QA (card #296/SF-QA1): the badge's only handle was its translated label,
   * and `"Sold"` / `"Active"` also appear on My Listings' filter tabs, in the
   * More sheet and inside a status filter chip — so a flow asserting the
   * listing's STATE could match something else entirely, or (as happened in
   * run-267 twice) fail because the badge itself had scrolled out of view with
   * no stable element to scroll back to. Additive and behaviour-neutral.
   */
  testID?: string;
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
export function StatusBadge({ status, overlay = false, testID }: StatusBadgeProps) {
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
          testID={testID}
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
        // TASK-K729 (review fix, LOW — contrast, only partially achieved by
        // ListingStatusBanner's colors.card move): even on a card/background
        // surface, `sold`'s fill (colors.secondary) sits at ~1.2:1 against
        // white/near-black — the pill still has almost no SHAPE, only its
        // label reads. A subtle 25%-alpha edge in the label's own colour
        // (withAlpha, never string concatenation — see lib/color.ts) gives
        // every status pill a real boundary on ANY surface (card, page
        // background, or a tinted accent fill) without adding a new token.
        borderWidth: 1,
        borderColor: withAlpha(accent.text, 0.25),
      }}
      accessibilityRole="text"
    >
      <Text
        testID={testID}
        style={{ color: accent.text, fontSize: 11, fontWeight: "600" }}
        numberOfLines={1}
      >
        {t(`listing.status.${status}`)}
      </Text>
    </View>
  );
}
