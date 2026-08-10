/**
 * ListingStatusBanner — TASK-K729 dedup + visual-hierarchy fix.
 *
 * Before this, `ListingDetail.tsx` had its own local `StatusBanner` (a
 * full-width accent strip, slides in from the top) and
 * `ListingUnavailableNotice.tsx` (the chat thread's reserved/sold recovery
 * notice) hand-rolled a SECOND, visually different treatment for the exact
 * same "this listing is reserved/sold" signal — a grey icon bubble on a
 * `colors.card` background indistinguishable from the header above it, with
 * no `StatusBadge` anywhere despite the K729 spec naming it explicitly. This
 * is the ONE shared component both screens now render.
 *
 * `layout="strip"` — full-bleed, centered, accent-bottom-border (ListingDetail).
 * `layout="row"`   — accent-filled rounded card, left/right-aligned per RTL,
 *                     StatusBadge + title on one line, optional subtitle below
 *                     (ListingUnavailableNotice's headline — the CTA row is
 *                     that screen's own addition, composed underneath this).
 *
 * Colours always come from `getStatusAccent` (statusAccent.ts) — the same map
 * `StatusBadge` and `SaleBuyerCard` read — so reserved/sold render identically
 * everywhere. Entrance animation guarded by `reduceMotion` (caller passes
 * `useReduceMotion()`), matching the house pattern (DESIGN_SYSTEM.md §7).
 */
import React from "react";
import { View } from "react-native";
import Animated, { FadeInDown, SlideInDown } from "react-native-reanimated";

import { Text } from "@/components/reusables/text";
import { StatusBadge } from "./StatusBadge";
import { getStatusAccent } from "./statusAccent";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

export interface ListingStatusBannerProps {
  status: "reserved" | "sold";
  /** Localized headline — callers control the exact sentence (viewer-scoped
   *  copy in chat vs the generic listing.detail.*Notice sentence on detail). */
  title: string;
  /** Optional secondary line — e.g. the "why the offer button is gone" reason. */
  subtitle?: string;
  reduceMotion?: boolean;
  layout?: "strip" | "row";
  testID?: string;
  /**
   * Rendered below the subtitle, still inside the SAME accent-filled
   * container — e.g. ListingUnavailableNotice's seller identity + recovery
   * CTA row. Keeps the whole notice on one legible accent surface instead of
   * an accent headline sitting on top of a separate neutral card (the
   * "barely perceptible" visual-hierarchy finding this component fixes).
   */
  children?: React.ReactNode;
}

export function ListingStatusBanner({
  status,
  title,
  subtitle,
  reduceMotion = false,
  layout = "row",
  testID,
  children,
}: ListingStatusBannerProps) {
  const colors = useColors();
  const { isRtl } = useLocalization();
  const accent = getStatusAccent(status, colors);
  const rowDir = isRtl ? "row-reverse" : "row";
  const isStrip = layout === "strip";

  const entering = reduceMotion
    ? undefined
    : isStrip
    ? SlideInDown.duration(320).springify()
    : FadeInDown.duration(240);

  return (
    <Animated.View
      entering={entering}
      testID={testID}
      style={{
        backgroundColor: accent.bg,
        paddingVertical: 10,
        paddingHorizontal: isStrip ? 16 : 12,
        // "stretch" (not "flex-start") for the row layout — the container has
        // no explicit width, and `children` (the CTA row) must span the full
        // available width regardless of LTR/RTL rather than shrink-align to
        // one edge, which "flex-start" would do (RN never auto-mirrors it).
        alignItems: isStrip ? "center" : "stretch",
        gap: 8,
        ...(isStrip
          ? { borderBottomWidth: 1, borderBottomColor: accent.text + "33" }
          : { borderWidth: 1, borderColor: accent.text + "33", borderRadius: 10 }),
      }}
    >
      <View
        style={{
          flexDirection: rowDir,
          alignItems: "center",
          gap: 6,
          justifyContent: isStrip ? "center" : "flex-start",
        }}
      >
        <StatusBadge status={status} />
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: isStrip ? accent.text : colors.foreground,
            letterSpacing: isStrip ? 0.2 : 0,
            textAlign: isStrip ? "center" : isRtl ? "right" : "left",
            flexShrink: 1,
          }}
        >
          {title}
        </Text>
      </View>
      {subtitle ? (
        <Text
          style={{
            fontSize: 12,
            color: isStrip ? accent.text : colors.mutedForeground,
            textAlign: isStrip ? "center" : isRtl ? "right" : "left",
          }}
        >
          {subtitle}
        </Text>
      ) : null}
      {children}
    </Animated.View>
  );
}
