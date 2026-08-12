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
 * `layout="row"`   — `colors.card` rounded card with a leading accent edge
 *                     (`borderStartWidth`), left/right-aligned per RTL,
 *                     StatusBadge + title on one line, optional subtitle below
 *                     (ListingUnavailableNotice's headline — the CTA row is
 *                     that screen's own addition, composed underneath this).
 *                     TASK-K729 (review fix, MEDIUM — visual hierarchy): this
 *                     used to be an `accent.bg` fill, the SAME background
 *                     `StatusBadge`'s own pill paints itself with — so the
 *                     pill had no shape (1.00:1 contrast against its own
 *                     container for `sold`), the `mutedForeground` subtitle
 *                     measured 3.79–3.95:1 (below WCAG AA 4.5:1) on the tint,
 *                     and the outline "View their listings" button's border
 *                     (`colors.border`) is byte-identical to the `sold` fill
 *                     (`colors.secondary`) in light mode, so it rendered with
 *                     no visible boundary at all. A `colors.card` surface —
 *                     the same "house" surface `SaleBuyerCard` already uses
 *                     for the identical outline-button-on-a-card pattern —
 *                     fixes all three at once: the badge pill, the subtitle,
 *                     and the button border all regain real contrast against
 *                     card white/near-black instead of a same-hue tint.
 *
 * Colours always come from `getStatusAccent` (statusAccent.ts) — the same map
 * `StatusBadge` and `SaleBuyerCard` read — so reserved/sold render identically
 * everywhere. Entrance animation guarded by `reduceMotion` (caller passes
 * `useReduceMotion()`), matching the house pattern (DESIGN_SYSTEM.md §7).
 *
 * TASK-K729 (review fix, LOW — redundant chrome): `showBadge` (default true)
 * lets a caller that already shows a `StatusBadge` immediately above this
 * banner (ListingHeader does, in the chat thread) omit the second, identical
 * pill here — the leading accent edge + headline still carry the status, so
 * nothing is lost, just one fewer restatement of the same fact.
 */
import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeInDown, SlideInDown } from "react-native-reanimated";

import { Text } from "@/components/reusables/text";
import { StatusBadge } from "./StatusBadge";
import { getStatusAccent } from "./statusAccent";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { withAlpha } from "@/lib/color";

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
   * Rendered below the subtitle, still inside the SAME container — e.g.
   * ListingUnavailableNotice's seller identity + recovery CTA row. Keeps the
   * whole notice on one legible surface (with the accent as a leading-edge
   * indicator, not a full-bleed tint — see the `layout="row"` note above)
   * instead of an accent headline sitting on top of a separate neutral card
   * (the "barely perceptible" visual-hierarchy finding this component fixes).
   */
  children?: React.ReactNode;
  /**
   * TASK-K729 (review fix, MEDIUM — layout): callers own their own outer
   * spacing. Without this, `layout="row"` (rendered as a direct child of a
   * flex:1, zero-padding screen root in Conversation.tsx) stretched
   * edge-to-edge, so its rounded corners read as clipped and its top border
   * doubled up on ListingHeader's own bottom hairline. Merged AFTER the
   * container's own style so callers can add margin/insets without fighting
   * the base layout.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * TASK-K729 (review fix, LOW — redundant chrome): `layout="row"`'s own
   * `StatusBadge` pill is now a THIRD restatement of the same status on
   * ListingUnavailableNotice — ListingHeader already renders a `StatusBadge`
   * beside the listing title ~8px above this banner, and the headline below
   * restates it again in words ("Item sold"). Default `true` (unchanged for
   * ListingDetail's own strip, which has no other badge on screen). Pass
   * `false` to omit the pill when a caller already shows one immediately
   * above — the leading accent edge + headline still carry the status.
   */
  showBadge?: boolean;
}

export function ListingStatusBanner({
  status,
  title,
  subtitle,
  reduceMotion = false,
  layout = "row",
  testID,
  children,
  style,
  showBadge = true,
}: ListingStatusBannerProps) {
  const colors = useColors();
  const { isRtl } = useLocalization();
  const accent = getStatusAccent(status, colors);
  const rowDir = isRtl ? "row-reverse" : "row";
  const isStrip = layout === "strip";
  // TASK-K729 (review fix, HIGH — dark mode / hardcoded color): `accent.text`
  // is always an hsl(...) string (never hex), so appending a hex alpha
  // suffix like `+ "33"` produced a syntactically-invalid value that RN's
  // color parser accepted anyway by silently DROPPING the suffix — the
  // border rendered fully opaque instead of at ~20% alpha. `withAlpha`
  // builds a real hsla(...)/rgba(...) value instead of string concatenation.
  const borderTint = withAlpha(accent.text, 0.2);

  const entering = reduceMotion
    ? undefined
    : isStrip
    ? SlideInDown.duration(320).springify()
    : FadeInDown.duration(240);

  return (
    <Animated.View
      entering={entering}
      testID={testID}
      style={[
        {
          // TASK-K729 (review fix, MEDIUM — visual hierarchy): `layout="row"`
          // sits on `colors.card` (not the accent fill) so StatusBadge's own
          // accent.bg pill, the mutedForeground subtitle and the outline
          // button's colors.border all regain real contrast — see the
          // component docstring. `layout="strip"` keeps its full-bleed accent
          // fill (a different, transient "flash" treatment on ListingDetail).
          backgroundColor: isStrip ? accent.bg : colors.card,
          paddingVertical: 10,
          paddingHorizontal: isStrip ? 16 : 12,
          // "stretch" (not "flex-start") for the row layout — the container has
          // no explicit width, and `children` (the CTA row) must span the full
          // available width regardless of LTR/RTL rather than shrink-align to
          // one edge, which "flex-start" would do (RN never auto-mirrors it).
          alignItems: isStrip ? "center" : "stretch",
          gap: 8,
          ...(isStrip
            ? { borderBottomWidth: 1, borderBottomColor: borderTint }
            : {
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                // The accent "leading edge" — `borderStart*` is a logical
                // property RN mirrors automatically for RTL (native forceRTL
                // is already on, see i18n/index.ts), so no manual isRtl flip
                // is needed here, unlike a plain `borderLeftWidth`.
                //
                // TASK-K729 (review fix, MEDIUM — dark mode / status
                // hierarchy): deliberately `accent.edge`, NOT `accent.text`.
                // `text` is tuned for LABEL legibility (StatusBadge's pill),
                // so for `sold` it's `secondaryForeground` — near-black in
                // light, near-WHITE in dark — which made the archived/dimmed
                // state the loudest element in the whole notice, louder than
                // the primary CTA and 5x louder than the amber `reserved`
                // edge. `edge` is tuned for "how loud should this bar be" —
                // see statusAccent.ts's docstring for the full mapping.
                borderStartWidth: 4,
                borderStartColor: accent.edge,
              }),
        },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: rowDir,
          alignItems: "center",
          gap: 6,
          justifyContent: isStrip ? "center" : "flex-start",
        }}
      >
        {showBadge ? <StatusBadge status={status} /> : null}
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
